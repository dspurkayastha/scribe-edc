import { simpleRctTemplate } from './simple-rct'
import { observationalTemplate } from './observational'
import { singleArmTemplate } from './single-arm'

export { simpleRctTemplate, observationalTemplate, singleArmTemplate }

export const studyTemplates = [
  { id: 'simple-rct', ...simpleRctTemplate },
  { id: 'observational', ...observationalTemplate },
  { id: 'single-arm', ...singleArmTemplate },
]
