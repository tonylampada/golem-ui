// Build entry only. The stylesheet is imported here rather than from `index.ts` so the published
// type declarations do not carry a `.css` import a consumer's tsc would have to resolve.
import './styles.css'

export * from './index'
