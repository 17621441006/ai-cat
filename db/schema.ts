import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const discussions=sqliteTable('discussions',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),author:text('author').notNull(),parentId:text('parent_id'),title:text('title').notNull(),body:text('body').notNull(),category:text('category').notNull(),createdAt:integer('created_at').notNull()
},t=>[index('idx_discussions_parent_created').on(t.parentId,t.createdAt)]);
export const workshopProgress=sqliteTable('workshop_progress',{
 userId:text('user_id').primaryKey(),completedAt:integer('completed_at').notNull(),graphJson:text('graph_json').notNull(),revision:integer('revision').notNull().default(1)
});
