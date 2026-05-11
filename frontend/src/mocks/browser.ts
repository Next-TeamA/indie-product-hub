import { setupWorker } from "msw/browser";
import { promotionHandlers } from "./handlers/promotions";

export const worker = setupWorker(...promotionHandlers);
