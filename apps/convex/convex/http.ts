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
import { Webhook } from "svix";

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
 * Security: Verifies Svix signature to ensure webhook authenticity.
 * @see https://docs.svix.com/receiving/verifying-payloads/how
 */
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Security: Verify Svix webhook signature
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    // Gate: Reject if webhook secret is not configured (DEV_ONLY safety)
    if (!webhookSecret) {
      console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({
          error: "Webhook endpoint not configured",
          message: "CLERK_WEBHOOK_SECRET environment variable must be set",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Extract Svix headers for signature verification
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    // Validate required Svix headers are present
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error("[Clerk Webhook] Missing Svix headers");
      return new Response(
        JSON.stringify({
          error: "Missing webhook signature headers",
          message: "Required headers: svix-id, svix-timestamp, svix-signature",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get raw request body for signature verification
    const payload = await request.text();

    // Verify webhook signature
    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
      console.log("[Clerk Webhook] Signature verified successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        "[Clerk Webhook] Signature verification failed:",
        errorMessage,
      );
      return new Response(
        JSON.stringify({
          error: "Webhook signature verification failed",
          message: "Invalid signature",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse JSON body after signature verification
    let body;
    try {
      body = JSON.parse(payload);
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
