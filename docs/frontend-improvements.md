# Frontend Improvement Suggestions

## Overview

The current HTML prototype (`Index2.0 (2).html`) is a static Alpine.js app with hardcoded data. Below are improvements to integrate with the backend and enhance functionality.

## Priority 1: Backend Integration

### Connect to API

Replace all hardcoded data with API calls:

```javascript
// Replace static recipes array with API fetch
async init() {
    const token = localStorage.getItem('token');
    const resp = await fetch('/api/v1/recipes', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    this.recipes = await resp.json();
}
```

### Authentication Flow

Add login/register screens:

- Email + password registration
- JWT token stored in localStorage
- Auth state management (redirect to login if no token)
- Household creation/join flow after registration

### Real-time Chat

Replace static messages with WebSocket or polling:

- Fetch messages from `/api/v1/messages`
- POST new messages
- Poll for updates or implement WebSocket connection

## Priority 2: Product Search & Price Comparison

### Search Bar

Add a product search that uses the hybrid search API:

- Search input on home page
- Results show products from multiple retailers
- Price comparison view side by side
- Filter by retailer, price range, category

### Shopping List Enhancement

Connect grocery list to product search:

- Each ingredient shows best available prices
- "Find cheapest" button per item
- Total cost optimization across retailers

## Priority 3: Smart Features

### Real Swipe Integration

Connect the swipe UI to the recommendation API:

- `POST /api/v1/recipes/{id}/swipe` on swipe left/right
- Fetch new cards from `GET /api/v1/recipes/recommendations`
- Discovery mode from `GET /api/v1/recipes/discover`
- Show personalization improving over time

### Budget Tracking

Connect budget widgets to the API:

- Weekly spending from `GET /api/v1/budget/weekly-summary`
- Add expenses via `POST /api/v1/budget/entries`
- Real-time budget progress bar

### Route Optimization

Connect route planner to real store data:

- Stores from `GET /api/v1/route/stores` (real Zürich locations)
- Route optimization via `POST /api/v1/route/optimize`
- Map markers from actual store coordinates
- Update map center to Zürich (47.3769, 8.5417) instead of Mannheim

## Priority 4: UI Enhancements

### Current Deals Section

New widget on home page showing best deals:

- Fetched from `GET /api/v1/products/deals`
- Grouped by retailer
- Discount percentage badges
- Swipeable carousel

### Price History Charts

For tracked products, show price trends:

- Line chart per product over time
- Alert when price drops below threshold
- Compare prices across retailers visually

### Dietary Filters

Add filter toggles in recipe discovery:

- Vegetarian, vegan, gluten-free, low-carb
- Filter sent as query params to API
- Persist preferences per user

### Receipt OCR UI

Connect to receipt scanning endpoint:

- Camera capture or file upload
- Show extracted items with prices
- Auto-add to budget tracking

### Notification System

Replace static notifications with real ones:

- Fetch from `GET /api/v1/notifications`
- Mark as read on dismiss
- Types: deal alerts, meal plan reminders, poll results

## Priority 5: Technical Improvements

### Framework Migration

Consider migrating from CDN Alpine.js to a build-based setup:

- **Recommended**: Vue.js or React with Vite
- Better TypeScript support
- Component-based architecture
- Proper state management (Pinia/Zustand)

### PWA Support

Make the app installable as a Progressive Web App:

- Service worker for offline support
- App manifest for home screen installation
- Push notifications for deals and reminders

### Responsive Design

Currently styled as iPhone frame - make it responsive:

- Remove iPhone frame wrapper for production
- Mobile-first responsive CSS
- Desktop layout with sidebar navigation

### Map Integration

Improve the Leaflet map:

- Switch from Mannheim to Zürich coordinates
- Real store markers from API
- Walking/driving route visualization
- Store details on marker click
