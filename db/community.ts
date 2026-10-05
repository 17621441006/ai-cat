import {env} from 'cloudflare:workers';
export function communityDb(){if(!env.DB)throw new Error('Discussion storage unavailable');return env.DB;}
