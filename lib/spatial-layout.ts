import {spatialEdges} from './spatial-data';

export type RelationScope = 'related' | 'all';
export const graphPositions: Record<string, {x:number;y:number}> = {
  supplier:{x:25,y:265}, po:{x:255,y:265}, material:{x:485,y:185},
  stock:{x:485,y:440}, receipt:{x:255,y:520}, invoice:{x:255,y:30},
  line:{x:715,y:310}, order:{x:945,y:185}, logistics:{x:945,y:440}, rule:{x:715,y:30},
};
export function relatedNodeIds(selected:string) {
  const ids = new Set([selected]);
  for (const [a,b] of spatialEdges) {if(a===selected)ids.add(b);if(b===selected)ids.add(a);}
  return ids;
}

export type LabelAnchor = {id:string;x:number;y:number;width:number;height:number;priority:number};
export type LabelPlacement = LabelAnchor & {left:number;top:number};
// In screen space: selected object first, then its neighbours. Never overlap labels.
export function placeSpatialLabels(anchors:LabelAnchor[],width:number,height:number):LabelPlacement[] {
  const placed:LabelPlacement[]=[];
  for(const anchor of [...anchors].sort((a,b)=>b.priority-a.priority)) {
    if(anchor.x<0||anchor.x>width||anchor.y<0||anchor.y>height)continue;
    const w=Math.min(anchor.width,width-24),h=anchor.height;
    const candidates=[[-w/2,-h-17],[-w/2,19],[20,-h/2],[-w-20,-h/2],[-w/2,-h-78],[-w/2,78],[50,-h-42],[-w-50,42]];
    for(const [dx,dy] of candidates) {
      const left=Math.max(12,Math.min(width-w-12,anchor.x+dx));
      const top=Math.max(54,Math.min(height-h-76,anchor.y+dy));
      if(top<54||top+h>height-64)continue;
      if(placed.some(p=>left<p.left+p.width+8&&left+w+8>p.left&&top<p.top+p.height+8&&top+h+8>p.top))continue;
      placed.push({...anchor,width:w,left,top});break;
    }
  }
  return placed;
}
