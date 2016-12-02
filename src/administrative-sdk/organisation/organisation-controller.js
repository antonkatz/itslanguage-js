import Organisation from './organisation';

/**
 * Controller class for the Organisation model.
 */
export default class OrganisationController {
  /**
   * @param {Connection} connection - Object to use for making a connection to the REST API and Websocket server.
   */
  constructor(connection) {
    /**
     * Object to use for making a connection to the REST API and Websocket server.
     * @type {Connection}
     */
    this._connection = connection;
  }

  /**
   * Create an organisation.
   *
   * @param {Organisation} organisation - Object to create.
   * @returns {Promise} Promise containing the newly created object.
   * @throws {Promise} If the server returned an error.
   */
  createOrganisation(organisation) {
    const url = this._connection._settings.apiUrl + '/organisations';
    const fd = JSON.stringify(organisation);

    return this._connection._secureAjaxPost(url, fd)
      .then(data => {
        const result = new Organisation(data.id, data.name);
        result.created = new Date(data.created);
        result.updated = new Date(data.updated);
        return result;
      });
  }

  /**
   * Get an organisation.
   *
   * @param {Organisation#id} organisationId - Specify an organisation identifier.
   * @returns {Promise} Promise containing an Organisation.
   * @throws {Promise} {@link Organisation#id} field is required.
   * @throws {Promise} If no result could not be found.
   */
  getOrganisation(organisationId) {
    if (!organisationId) {
      return Promise.reject(new Error('organisationId field is required'));
    }
    const url = this._connection._settings.apiUrl + '/organisations/' + organisationId;

    return this._connection._secureAjaxGet(url)
      .then(data => {
        const organisation = new Organisation(data.id, data.name);
        organisation.created = new Date(data.created);
        organisation.updated = new Date(data.updated);
        return organisation;
      });
  }

  /**
   * List all organisations.
   *
   * @returns {Promise} Promise containing a list of Organisations.
   * @throws {Promise} If no result could not be found.
   */
  listOrganisations() {
    const url = this._connection._settings.apiUrl + '/organisations';

    return this._connection._secureAjaxGet(url)
      .then(data => {
        const organisations = [];
        data.forEach(datum => {
          const organisation = new Organisation(datum.id, datum.name);
          organisation.created = new Date(datum.created);
          organisation.updated = new Date(datum.updated);
          organisations.push(organisation);
        });
        return organisations;
      });
  }
}