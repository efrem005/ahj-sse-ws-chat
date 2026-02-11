import Entity from './Entity.js';
import createRequest from './createRequest.js';

export default class ChatAPI extends Entity {
  constructor() {
    super();
    this.baseURL = process.env.FETCH_URL || 'http://localhost:3000';
  }

  async createUser(name) {
    const response = await createRequest({
      method: 'POST',
      url: `${this.baseURL}/new-user`,
      data: { name },
    });
    return response;
  }
}
