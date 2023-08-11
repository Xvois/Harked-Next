import {pb} from "@/functions/database_functions/hooks";


/**
 * A generalised function to fetch data from the Pocketbase db.
 * @param collection
 * @param filter
 * @param sort
 * @param page
 * @param perPage
 * @param autoCancel
 */
export const fetchPBData = async (collection: string, filter = '', sort = '', page = 1, perPage = 50, autoCancel = true) => {
    return (await pb.collection(collection).getList(page, perPage, {
        filter: filter,
        sort: sort,
        "$autoCancel": autoCancel
    })).items as any[];
}

export const fetchPBFirstData = async <T>(collection: string, filter = '', sort= '', expand = ''): Promise<T> => {
    return (await pb.collection(collection).getFirstListItem(filter, {sort, expand}));
}

/**
 * Fetches the item with the passed id in the collection from the Pocketbase db.
 * @param collection
 * @param id
 * @param expand
 */
export const fetchPBDataByID = async <T>(collection: string, id: string, expand = ''): Promise<T> => {
    return await pb.collection(collection).getOne(id, {expand: expand});
}
/**
 * Fetches the full list of items from a collection.
 * @param collection
 * @param filter
 * @param sort
 */
export const fetchPBFullList = async <T>(collection: string, filter = '', sort = '', expand = ''): Promise<T[]> => {
    return await pb.collection(collection).getFullList({filter: filter, sort: sort, expand: expand});
}
/**
 * Fetches paged Pocketbase data.
 * @param collection
 * @param perPage
 * @param page
 * @param filter
 * @param sort
 */
export const fetchPBPagedData = async (collection: string, perPage: number, page = 0, filter = '', sort = '') => {
    return await pb.collection(collection).getList(page, perPage, {
        filter: filter,
        sort: sort
    });
}

export const getAuthData = () => {
    return pb.authStore;
}