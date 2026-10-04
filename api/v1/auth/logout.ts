import { route, ok } from '../../../server/http';
import { clearCookie } from '../../../server/auth';

export default route({ POST: async () => ok({ ok: true }, { 'Set-Cookie': clearCookie() }) });
