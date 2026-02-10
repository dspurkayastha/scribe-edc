export { simpleRctTemplate } from './simple-rct'
export { observationalTemplate } from './observational'
export { singleArmTemplate } from './single-arm'

export const studyTemplates = [
  { id: 'simple-rct', ...require('./simple-rct').simpleRctTemplate },
  { id: 'observational', ...require('./observational').observationalTemplate },
  { id: 'single-arm', ...require('./single-arm').singleArmTemplate },
]
