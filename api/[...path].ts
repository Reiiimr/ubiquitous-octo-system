import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dispatchApi } from '../server/api-dispatch';

export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  return dispatchApi(req, res);
}
