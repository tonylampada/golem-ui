import{j as e}from"./jsx-runtime-u17CrQMm.js";import{u as r,M as i}from"./blocks-dAe7-aE8.js";import{a}from"./Auth.docs-Dv_o3Fya.js";import{c}from"./Chat.docs-CL6S0OoA.js";import{e as l}from"./Editor.docs-2sk78TV5.js";import{r as h}from"./RecordForm.docs-BqPUyPF8.js";import{r as d}from"./RecordList.docs-Cz49BNgX.js";import{r as m}from"./Report.docs-DGjlsNQ7.js";import{s as p}from"./Shell.docs-Bf9CgL0r.js";import{t as x}from"./Timeline.docs-B_twooIl.js";import{u as g}from"./Upload.docs-Cm7HOdda.js";import"./preload-helper-PPVm8Dsz.js";import"./iframe-DO65VYUc.js";import"./index-B8MyTdpM.js";const u=[p,c,a,d,h,m,l,x,g];function s(o){const n={code:"code",h1:"h1",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...r(),...o.components};return e.jsxs(e.Fragment,{children:[e.jsx(i,{title:"Introduction"}),`
`,e.jsx(n.h1,{id:"golem-ui",children:"golem-ui"}),`
`,e.jsxs(n.p,{children:["UI components with ",e.jsx(n.strong,{children:"one ABI"}),`, built so an agent assembling a screen unattended gets it right the
first time.`]}),`
`,e.jsx(n.pre,{children:e.jsx(n.code,{className:"language-tsx",children:`<Component config={/* plain data, validated */} adapters={/* how it talks to the world */} />
`})}),`
`,e.jsxs(n.ul,{children:[`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"config"}),` is JSON-serializable data, validated by a Zod schema on mount. Wrong config renders a
loud error card naming the field and the rule — in dev and in prod.`]}),`
`,e.jsxs(n.li,{children:[e.jsx(n.strong,{children:"adapters"})," are TypeScript interfaces (",e.jsx(n.code,{children:"Records"}),", ",e.jsx(n.code,{children:"Files"}),", ",e.jsx(n.code,{children:"Identity"}),", ",e.jsx(n.code,{children:"Chat"}),", ",e.jsx(n.code,{children:"Clock"}),`,
`,e.jsx(n.code,{children:"Navigation"}),`). A component never imports a data layer, a router or a fetch; it calls only what it
was handed. `,e.jsx(n.code,{children:"golem-ui"}),` ships an in-memory fake of each, which is what every story on this site
runs on.`]}),`
`]}),`
`,e.jsxs(n.p,{children:[e.jsx(n.strong,{children:e.jsx("a",{href:"https://tonylampada.github.io/golem-ui/app/",target:"_top",children:`See the components in a real
app →`})}),` — the showcase is a small demo built only from this kit on the fake adapters, phone
first. This site is the spec; that one is what it looks like assembled. Every screen in it is now a
component from this kit: there are no placeholders left in the showcase.`]}),`
`,e.jsxs(n.p,{children:[e.jsx(n.strong,{children:e.jsx("a",{href:"https://tonylampada.github.io/golem-ui/app/#/api",target:"_top",children:`The same spec on a
phone →`})}),` — one API page per component, generated from the same schema, adapters and examples
this site is, so the two cannot disagree.`]}),`
`,e.jsx(n.p,{children:"The components so far:"}),`
`,e.jsx("ul",{children:u.map(t=>e.jsxs("li",{children:[e.jsx("strong",{children:t.name})," — ",t.tagline]},t.slug))}),`
`,e.jsx(n.p,{children:`Every component page has the same five sections in the same order: what it is for, the configuration
object, the adapters it needs, one complete example, failure modes. Every example on a page is also a
test fixture, so a broken example is a broken build.`})]})}function A(o={}){const{wrapper:n}={...r(),...o.components};return n?e.jsx(n,{...o,children:e.jsx(s,{...o})}):s(o)}export{A as default};
