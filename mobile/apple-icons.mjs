// Rasterize the Android launcher vector verbatim into Apple asset dimensions.
// Requires rsvg-convert (librsvg); no generated or substituted artwork.
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(root, 'android/app/src/main/res/drawable/yata_icon.xml'), 'utf8');
const paths = [...source.matchAll(/<path\s+([^>]+)\/>/g)].map(([, attributes]) => {
    const attrs = Object.fromEntries([...attributes.matchAll(/android:(\w+)="([^"]+)"/g)].map(([, k, v]) => [k, v]));
    return {fill: attrs.fillColor, svg: '<path d="' + attrs.pathData + '" fill="' + (attrs.fillColor || 'none') + '"' +
        (attrs.strokeColor ? ' stroke="' + attrs.strokeColor + '" stroke-width="' + attrs.strokeWidth + '"' : '') + '/>'};
});
if (paths.length !== 7 || paths[0].fill !== '#28342F') throw Error('Review changed Android vector before exporting Apple icons');
const temp = mkdtempSync(path.join(tmpdir(), 'yata-icons-'));
function render(file, width, height, foreground, background, opaque = false) {
    const size = Math.min(width, height);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
        (background ? '<rect width="100%" height="100%" fill="' + paths[0].fill + '"/>' : '') +
        (foreground ? '<g transform="translate(' + ((width-size)/2) + ' ' + ((height-size)/2) + ') scale(' + size/108 + ')">' + paths.slice(1).map(p=>p.svg).join('') + '</g>' : '') + '</svg>';
    const input = path.join(temp, 'icon.svg');
    writeFileSync(input, svg);
    execFileSync('rsvg-convert', ['-o', file, input]);
    if (opaque) execFileSync('magick', [file, '-alpha', 'off', file]);
}
try {
    render(path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), 1024, 1024, true, true, true);
    const brand = path.join(root, 'tvos/YATA/Assets.xcassets/App Icon.brandassets');
    for (const [name,w,h,scales] of [['App Icon',400,240,[1,2]], ['App Store',1280,768,[1]]]) {
        for (const layer of ['Front','Back']) for (const scale of scales) {
            render(path.join(brand, name+'.imagestack', layer+'.imagestacklayer/Content.imageset', 'icon-'+scale+'x.png'),
                w*scale,h*scale,layer==='Front',layer==='Back');
        }
    }
    for (const [name,w] of [['Top Shelf',1920],['Top Shelf Wide',2320]]) for (const scale of [1,2]) {
        render(path.join(brand,name+'.imageset','shelf-'+scale+'x.png'),w*scale,720*scale,true,true,true);
    }
} finally { rmSync(temp,{recursive:true,force:true}); }
