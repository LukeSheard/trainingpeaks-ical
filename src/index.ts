/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

import type { VEvent, CalendarResponse } from "node-ical";
import nodeIcal from "node-ical/ical";
import * as ICAL from "ical-generator";

const URL = "http://www.trainingpeaks.com/ical/YTXGAVCLXW7WY.ics";

self.setImmediate = function (cb) {
  setTimeout(cb, 0);
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const icalResponse = await fetch(URL);

    const body = await icalResponse.text();

    const feed = await new Promise<CalendarResponse>((resolve, reject) => {
      nodeIcal.parseICS(body, (err: Error, ics: CalendarResponse) => {
        if (err) return reject(err);
        return resolve(ics);
      });
    });

    // const feed = await nodeIcal.async.fromURL(URL);

    const events = Object.values(feed).filter(
      (event) => event.type === "VEVENT"
    ) as VEvent[];

    events.sort((a, b) => {
      return Number(a.start) - Number(b.start);
    });

    const name = "trainingpeaks";

    const calendar = new ICAL.ICalCalendar({
      name,
      method: ICAL.ICalCalendarMethod.PUBLISH,
    });

    await Promise.all(events.map(async (event) => {
      if (event.summary === "Bike: XMAS DAY Optional Spin") {
        console.log(event);
      }
      calendar.createEvent({
        id: event.uid,
        start: event.start,
        end: event.end,
        summary: event.summary,
        description: event.description,
        allDay: event.start.dateOnly
      });
    }));

    return new Response(calendar.toString(), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  },
};
