import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
const sheets = [
 ['defense-plants-source.png', ['sunflower','peashooter','snowpea','repeater','wallnut','tallnut','cherry','potatomine','spikeweed','threepeater','cabbagepult','squash','torchwood','gatling','puffshroom','garlic']],
 ['defense-actors-source.png', ['basic','cone','bucket','football','runner','brute','pea','icepea','sun','mower','shovel','explosion','pause','play','expand','cabbage']],
];
await mkdir('public/images/defense',{recursive:true});
for (const [source,names] of sheets) {
 const input=await readFile(`public/images/${source}`);const meta=await sharp(input).metadata();const cell=meta.width/4;
 for(let i=0;i<names.length;i++) {
  const left=Math.round(i%4*cell),top=Math.round(Math.floor(i/4)*cell),w=Math.round((i%4+1)*cell)-left,h=Math.round((Math.floor(i/4)+1)*cell)-top;
  const {data}=await sharp(input).extract({left,top,width:w,height:h}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const seen=new Uint8Array(w*h),queue=[];
  const white=p=>{const o=p*4;return Math.min(data[o],data[o+1],data[o+2])>229&&Math.max(data[o],data[o+1],data[o+2])-Math.min(data[o],data[o+1],data[o+2])<27;};
  const push=p=>{if(p>=0&&p<w*h&&!seen[p]&&white(p)){seen[p]=1;queue.push(p);}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  for(let q=0;q<queue.length;q++){const p=queue[q],x=p%w,y=Math.floor(p/w);if(x)push(p-1);if(x<w-1)push(p+1);if(y)push(p-w);if(y<h-1)push(p+w);}
  let minX=w,minY=h,maxX=0,maxY=0;
  for(let p=0;p<w*h;p++){if(seen[p])data[p*4+3]=0;else{const x=p%w,y=Math.floor(p/w);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
  minX=Math.max(0,minX-3);minY=Math.max(0,minY-3);maxX=Math.min(w-1,maxX+3);maxY=Math.min(h-1,maxY+3);
  await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9,palette:true,quality:94}).toFile(`public/images/defense/${names[i]}.png`);
 }
}
console.log('32 transparent raster defense sprites created');
