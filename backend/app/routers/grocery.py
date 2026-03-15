import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_household_id, get_pagination, Pagination
from app.models.grocery import GroceryList, GroceryItem
from app.schemas.grocery import (
    GroceryListResponse, GroceryItemResponse, GroceryItemUpdate,
    BulkCheckRequest, BulkItemCreateRequest,
)

router = APIRouter()


@router.get("/lists", response_model=list[GroceryListResponse])
def get_lists(
    household_id: uuid.UUID = Depends(get_household_id),
    pagination: Pagination = Depends(get_pagination),
    session: Session = Depends(get_session),
):
    lists = session.exec(
        select(GroceryList)
        .where(GroceryList.household_id == household_id)
        .offset(pagination.offset)
        .limit(pagination.limit)
    ).all()
    if not lists:
        return []
    list_ids = [gl.id for gl in lists]
    all_items = session.exec(select(GroceryItem).where(GroceryItem.grocery_list_id.in_(list_ids))).all()  # type: ignore
    items_by_list: dict[uuid.UUID, list[GroceryItem]] = {}
    for item in all_items:
        items_by_list.setdefault(item.grocery_list_id, []).append(item)
    return [
        GroceryListResponse(
            id=gl.id, name=gl.name, estimated_total=gl.estimated_total,
            items=[GroceryItemResponse(id=i.id, ingredient_name=i.ingredient_name, quantity=i.quantity, is_checked=i.is_checked) for i in items_by_list.get(gl.id, [])],
        )
        for gl in lists
    ]


# IMPORTANT: /items/bulk must come BEFORE /items/{item_id} to avoid route shadowing
@router.patch("/items/bulk")
def bulk_update_items(
    body: BulkCheckRequest,
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    item_ids = [u.item_id for u in body.updates]
    items = session.exec(select(GroceryItem).where(GroceryItem.id.in_(item_ids))).all()
    item_map = {i.id: i for i in items}

    # Verify household ownership
    list_ids = {i.grocery_list_id for i in items}
    lists = session.exec(select(GroceryList).where(GroceryList.id.in_(list_ids))).all()
    valid_list_ids = {gl.id for gl in lists if gl.household_id == household_id}

    updated = []
    for update in body.updates:
        item = item_map.get(update.item_id)
        if item and item.grocery_list_id in valid_list_ids:
            item.is_checked = update.is_checked
            session.add(item)
            updated.append(item.id)

    session.commit()
    return {"updated_count": len(updated)}


@router.patch("/items/{item_id}", response_model=GroceryItemResponse)
def update_item(
    item_id: uuid.UUID,
    body: GroceryItemUpdate,
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    item = session.get(GroceryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    grocery_list = session.get(GroceryList, item.grocery_list_id)
    if not grocery_list or grocery_list.household_id != household_id:
        raise HTTPException(status_code=404, detail="Item not found")
    if body.is_checked is not None:
        item.is_checked = body.is_checked
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.post("/lists/{list_id}/items/bulk", status_code=201)
def bulk_add_items(
    list_id: uuid.UUID,
    body: BulkItemCreateRequest,
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    grocery_list = session.get(GroceryList, list_id)
    if not grocery_list or grocery_list.household_id != household_id:
        raise HTTPException(status_code=404, detail="Grocery list not found")

    created = []
    for item_data in body.items:
        item = GroceryItem(
            grocery_list_id=list_id,
            ingredient_name=item_data.ingredient_name,
            quantity=item_data.quantity,
        )
        session.add(item)
        created.append(item)

    session.commit()
    for item in created:
        session.refresh(item)

    return [
        GroceryItemResponse(id=i.id, ingredient_name=i.ingredient_name, quantity=i.quantity, is_checked=i.is_checked)
        for i in created
    ]
