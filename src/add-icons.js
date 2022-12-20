import { library } from '@fortawesome/fontawesome-svg-core'
import { faSpinner, faHeadphonesAlt, faBookOpen, faFilm, faDatabase, faSave, faCog, faLink, faBars, faSync, faTrash, faExpand, faCompress, faIgloo, faFeather, faProjectDiagram, faCopy, faDownload, faPause, faDollarSign, faLock, faIdCardAlt, faQuestionCircle, faSitemap } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faSpinner, faHeadphonesAlt, faBookOpen, faFilm, faDatabase, faSave, faCog, faLink, faBars, faSync, faTrash, faExpand, faCompress, faIgloo, faFeather, faProjectDiagram, faCopy, faDownload, faPause, faDollarSign, faLock, faIdCardAlt, faQuestionCircle, faSitemap)

export default function (app) {
  app.component('FontAwesomeIcon', FontAwesomeIcon)

  return app
}
