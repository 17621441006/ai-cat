import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const database=new DatabaseSync(':memory:');
database.exec(readFileSync('drizzle/0001_great_wong.sql','utf8'));
let user={userId:'learner-a'},unavailable=false;
export function setUser(value){user=value}
export function setUnavailable(value){unavailable=value}
export async function getChatGPTUser(){return user}
export function workshopDb(){if(unavailable)throw new Error('Test: unavailable database');return{prepare(sql){return{bind(...params){return{async first(){return database.prepare(sql).get(...params)},async run(){return database.prepare(sql).run(...params)}}}}}}}
