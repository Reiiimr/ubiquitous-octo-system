import { route, ok } from '../../../server/http';
import { requireAuth } from '../../../server/auth';

export default route({
  GET: async (c) => {
    const s = await requireAuth(c.req);
    return ok({ account: { id: s.id, type: s.type, name: s.name, username: s.username, accountKey: s.key } });
  },
});
