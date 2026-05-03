// utils.js - Shared optimized utilities (same engine as classic Paint)

const PaintUtils = {
    hexToRgba(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        return { r: parseInt(hex.substr(0,2),16), g: parseInt(hex.substr(2,2),16), b: parseInt(hex.substr(4,2),16), a: 255 };
    },
    hexToRgbValues(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        return [parseInt(hex.substr(0,2),16), parseInt(hex.substr(2,2),16), parseInt(hex.substr(4,2),16)];
    },
    rgbaToHex(r, g, b) {
        return '#'+((1<<24)+(Math.round(r)<<16)+(Math.round(g)<<8)+Math.round(b)).toString(16).slice(1);
    },
    hslToRgb(h, s, l) {
        h/=360; s/=240; l/=240;
        let r,g,b;
        if(s===0){r=g=b=l;}else{
            const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;
            r=PaintUtils._h2r(p,q,h+1/3);g=PaintUtils._h2r(p,q,h);b=PaintUtils._h2r(p,q,h-1/3);
        }
        return {r:(r*255+.5)|0,g:(g*255+.5)|0,b:(b*255+.5)|0};
    },
    _h2r(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;},
    rgbToHsl(r,g,b){
        r/=255;g/=255;b/=255;
        const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
        let h,s,l=(mx+mn)/2;
        if(mx===mn){h=s=0;}else{
            const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);
            switch(mx){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}
        }
        return {h:Math.round(h*360),s:Math.round(s*240),l:Math.round(l*240)};
    },
    bresenhamLine(x0,y0,x1,y1,cb){
        const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
        let err=dx-dy;
        while(true){cb(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>-dy){err-=dy;x0+=sx;}if(e2<dx){err+=dx;y0+=sy;}}
    },
    floodFill(imageData,sx,sy,fillColor,w,h){
        const data=imageData.data;
        sx|=0;sy|=0;if(sx<0||sx>=w||sy<0||sy>=h)return;
        const si=(sy*w+sx)*4,tR=data[si],tG=data[si+1],tB=data[si+2],tA=data[si+3];
        const[fR,fG,fB]=PaintUtils.hexToRgbValues(fillColor);
        if(tR===fR&&tG===fG&&tB===fB&&tA===255)return;
        const vis=new Uint8Array(w*h),stk=[sx,sy];
        while(stk.length>0){
            const y=stk.pop(),x=stk.pop();
            if(x<0||x>=w||y<0||y>=h)continue;
            const pi=y*w+x;if(vis[pi])continue;
            const idx=pi*4;
            if(data[idx]!==tR||data[idx+1]!==tG||data[idx+2]!==tB||data[idx+3]!==tA)continue;
            let rx=x;while(rx<w){const ri=(y*w+rx)*4;if(data[ri]!==tR||data[ri+1]!==tG||data[ri+2]!==tB||data[ri+3]!==tA||vis[y*w+rx])break;rx++;}
            let lx=x-1;while(lx>=0){const li=(y*w+lx)*4;if(data[li]!==tR||data[li+1]!==tG||data[li+2]!==tB||data[li+3]!==tA||vis[y*w+lx])break;lx--;}lx++;
            for(let cx=lx;cx<rx;cx++){const ci=(y*w+cx)*4;vis[y*w+cx]=1;data[ci]=fR;data[ci+1]=fG;data[ci+2]=fB;data[ci+3]=255;if(y>0&&!vis[(y-1)*w+cx])stk.push(cx,y-1);if(y<h-1&&!vis[(y+1)*w+cx])stk.push(cx,y+1);}
        }
    },
    getPixelColor(ctx,x,y){const d=ctx.getImageData(x|0,y|0,1,1).data;return PaintUtils.rgbaToHex(d[0],d[1],d[2]);},
    airbrushSpray(ctx,x,y,radius,density,color){
        ctx.fillStyle=color;
        for(let i=0;i<density;i++){const a=Math.random()*6.2832,d=Math.random()*radius;ctx.fillRect((x+Math.cos(a)*d)|0,(y+Math.sin(a)*d)|0,1,1);}
    },
    clamp(v,mn,mx){return v<mn?mn:v>mx?mx:v;},
    _elCache:{},el(id){return PaintUtils._elCache[id]||(PaintUtils._elCache[id]=document.getElementById(id));}
};
