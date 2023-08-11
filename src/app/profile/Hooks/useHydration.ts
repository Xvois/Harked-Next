import {retrieveUser} from "@/database_functions/users";
import {devLog} from "@/utility_functions/utilities";
import {RecordSubscription} from "pocketbase";
import {Subscription} from "@/database_functions/hooks";

/**
 * Runs the argument callback function as a side effect of a successful
 * hydration by the argument user_id.
 * @param user_id
 * @param callback
 */
export const useHydration = async (user_id: string, callback: Function) => {
    const user = await retrieveUser(user_id);
    const callbackWrapper: (data: RecordSubscription<Record<string, any>>) => void = (event) => {
        if (event.action === "create" && event.record.term === "long_term" && event.record.owner === user.id) {
            devLog("Hydration event noted!");
            callback();
        }
    }

    // Subscribe to "datapoints" with the modified callback
    const subscription = new Subscription("datapoints", "*", callbackWrapper, true);
    subscription.invoke();
}