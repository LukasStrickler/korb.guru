/**
 * Convex HTTP Actions for webhooks and external integrations.
 *
 * Routes:
 * - GET /health - Health check endpoint
 * - POST /clerk-webhook - Clerk user event webhooks
 *
 * @see https://docs.convex.dev/functions/http-actions
 */
import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";

const http = httpRouter();

/**
 * Health check endpoint for monitoring and load balancers.
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "convex",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

/**
 * Clerk webhook handler for user events.
 *
 * Handles:
 * - user.deleted: Clean up user data when deleted from Clerk
 *
 * Security: In production, verify the Svix signature header.
 * @see https://docs.svix.com/receiving/verifying-payloads/how
 */
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // TODO: Verify Svix webhook signature in production
    // const svixSignature = request.headers.get("svix-signature");
    // const svixTimestamp = request.headers.get("svix-timestamp");
    // const svixId = request.headers.get("svix-id");

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const eventType = body.type;

    // Handle user deletion
    if (eventType === "user.deleted") {
      const clerkId = body.data?.id;
      if (!clerkId) {
        return new Response(JSON.stringify({ error: "Missing user ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // TODO: Implement user cleanup
      // 1. Find user by clerkId
      // 2. Delete user's recipes
      // 3. Delete user record
      // For now, just log the event
      console.log(`[Clerk Webhook] User deleted: ${clerkId}`);

      return new Response(
        JSON.stringify({
          received: true,
          type: eventType,
          clerkId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Acknowledge other events
    return new Response(
      JSON.stringify({
        received: true,
        type: eventType,
        note: "Event type not handled",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }),
});

export default http;
