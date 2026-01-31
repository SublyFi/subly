"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionStatus = void 0;
/**
 * Subscription status enum
 */
var SubscriptionStatus;
(function (SubscriptionStatus) {
    /** User has never subscribed to this plan */
    SubscriptionStatus["NotSubscribed"] = "not_subscribed";
    /** Subscription is active and valid */
    SubscriptionStatus["Active"] = "active";
    /** User has cancelled but subscription may still be valid until period ends */
    SubscriptionStatus["Cancelled"] = "cancelled";
    /** Subscription has expired */
    SubscriptionStatus["Expired"] = "expired";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
//# sourceMappingURL=subscription.js.map