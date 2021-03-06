/**
 * This file contains the readily available functions which interact with the
 * ITSLanguage pronunciation challenge API.
 *
 * @module api/challenges/pronunciation
 */

import { authorisedRequest } from '../../communication';

/**
 * The URL for the pronunciation challenge handler(s).
 * @type {string}
 */
const url = '/challenges/pronunciation';

/**
 * Create a new pronunciation challenge.
 *
 * @param {Object} challenge - The pronunciation challenge to create.
 *
 * @returns {Promise} - The pronunciation challenge creation promise.
 */
export function create(challenge) {
  return authorisedRequest('POST', url, challenge);
}

/**
 * Get a single pronunciation challenge by its ID.
 *
 * @param {string} id - The ID of the desired pronunciation challenge.
 *
 * @returns {Promise} - The promise for the pronunciation challenge.
 */
export function getById(id) {
  return authorisedRequest('GET', `${url}/${id}`);
}

/**
 * Get a all pronunciation challenges.
 *
 * By default all pronunciation challenges are fetched though it is allowed to pass
 * filters as a `URLSearchParams` object.
 *
 * @param {URLSearchParams} [filters] - The filters to apply to the category list.
 *
 * @throws {Promise<string>} - If the given optional filters are not an instance of
 * `URLSearchParams`.
 *
 * @returns {Promise} - The promise for the pronunciation challenges.
 */
export function getAll(filters) {
  let urlWithFilters = url;

  if (filters) {
    if (!(filters instanceof URLSearchParams)) {
      return Promise.reject(
        new Error('The filters should be a `URLSearchParams` object.'),
      );
    }

    urlWithFilters += `?${filters.toString()}`;
  }

  return authorisedRequest('GET', urlWithFilters);
}

/**
 * Delete the pronunciation challenge with the given ID.
 *
 * @param {string} id - The ID of the pronunciation challenge to delete.
 *
 * @returns {Promise} - The pronunciation delete promise.
 */
export function deleteChallenge(id) {
  return authorisedRequest('DELETE', `${url}/${id}`);
}
