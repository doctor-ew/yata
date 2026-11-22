import test from 'node:test';
import assert from 'node:assert/strict';
import {mountFullscreenNavigation} from '../mobile/fullscreen-navigation.mjs';

test('fullscreen navigation is an accessible drawer and returns to its original place on exit',()=>{
 const doc=new EventTarget();
 class Node extends EventTarget {
  children=[];hidden=false;dataset={};attributes=new Map();inert=false;
  append(child){child.remove();this.children.push(child);child.parentElement=this;}
  prepend(child){child.remove();this.children.unshift(child);child.parentElement=this;}
  insertBefore(child,next){child.remove();this.children.splice(this.children.indexOf(next),0,child);child.parentElement=this;}
  remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null;}}
  get nextSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]??null;}
  setAttribute(k,v){this.attributes.set(k,v);}
 }
 doc.createElement=()=>new Node();const body=new Node(),screen=new Node(),nav=new Node(),links=new Node(),after=new Node();links.id='links';nav.append(links);body.append(screen);body.append(nav);body.append(after);
 const controls=mountFullscreenNavigation({doc,screen,nav,links});const toggle=nav.children[0];
 const mode=open=>{const event=new Event('yata:window-mode');event.detail={open};doc.dispatchEvent(event);};
 nav.inert=true;mode(true);assert.equal(nav.parentElement,screen);assert.equal(nav.inert,false);assert.equal(links.hidden,true);assert.equal(toggle.hidden,false);assert.equal(toggle.attributes.get('aria-expanded'),'false');
 toggle.dispatchEvent(new Event('click'));assert.equal(links.hidden,false);assert.equal(toggle.attributes.get('aria-label'),'Hide navigation');
 toggle.dispatchEvent(new Event('click'));assert.equal(links.hidden,true);
 mode(false);assert.equal(nav.parentElement,body);assert.equal(nav.nextSibling,after);assert.equal(toggle.hidden,true);assert.equal(links.hidden,false);
 mode(true);assert.equal(links.hidden,true);controls.dispose();assert.equal(nav.parentElement,body);assert.equal(links.hidden,false);assert.equal(nav.children.length,1);mode(true);assert.equal(nav.parentElement,body);
});
