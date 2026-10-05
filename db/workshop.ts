import {env} from 'cloudflare:workers';
export function workshopDb(){if(!env.DB)throw new Error('Workshop progress storage unavailable');return env.DB;}
