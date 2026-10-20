import {handleEmailRequest,dispatchSignalEmails} from "../lib/email-notifications.mjs";
import {getMarket} from "../lib/market";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const emailResponse=await handleEmailRequest(request,env).catch(()=>Response.json({error:"邮件服务暂时不可用，请稍后重试。"},{status:503,headers:{"Cache-Control":"no-store"}}));
    if(emailResponse)return emailResponse;
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
  scheduled(_event: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(getMarket().then(snapshot=>dispatchSignalEmails(env,snapshot)).then(result=>console.log("email-signal-job",JSON.stringify(result))).catch(()=>console.error("email-signal-job failed")));
  },
};
