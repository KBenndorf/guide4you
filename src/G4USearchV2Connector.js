import ol from 'openlayers'
import $ from 'jquery'

import {SearchConnector} from 'guide4you-module-search/src/SearchConnector'

export class G4USearchV2Connector extends SearchConnector {
  constructor (options) {
    super(options)

    this.autocompleteUrl_ = this.serviceURL.clone()
    this.autocompleteUrl_.url += '/Autocomplete.ashx?term={searchstring}'
    this.fuzzyUrl_ = this.serviceURL.clone()
    this.fuzzyUrl_.url += '/findall.ashx?option=2&term={searchstring}'
    this.byHandleUrl_ = this.serviceURL.clone()
    this.byHandleUrl_.url += '/findall.ashx?option=1&term={searchstring}'

    this.dataProjection = 'EPSG:4326'

    this.wktParser_ = new ol.format.WKT()
  }

  setMap (map) {
    if (map) {
      this.autocompleteUrl_.extractParamsFromMap(map)
      this.fuzzyUrl_.extractParamsFromMap(map)
      this.byHandleUrl_.extractParamsFromMap(map)
    }
    super.setMap(map)
  }

  getAutoComplete (input) {
    return new Promise((resolve, reject) => {
      let finalUrl = this.autocompleteUrl_.clone().expandTemplate('searchstring', input).finalize()

      $.ajax({
        url: finalUrl,
        dataType: 'text',
        success: text => {
          let results = this.parseFeatures(text)
          resolve(SearchConnector.flipTuples(results.map(r => [r.name, r.name])))
        },
        error: (jqXHR, textStatus) => {
          reject(`Problem while trying to get search results from the Server: ${textStatus} - ${jqXHR.responseText} ` +
            `(SearchURL: ${finalUrl})`)
        }
      })
    })
  }

  getSearchResult (input) {
    return new Promise((resolve, reject) => {
      let finalUrl = this.fuzzyUrl_.clone().expandTemplate('searchstring', input).finalize()

      $.ajax({
        url: finalUrl,
        dataType: 'text',
        success: text => {
          let results = this.parseFeatures(text)
          let features = results.map(r => this.readFeature_(r))
          resolve(SearchConnector.flipTuples(features.map(f => [f.get('name'), f])))
        },
        error: (jqXHR, textStatus) => {
          reject(`Problem while trying to get search results from the Server: ${textStatus} - ${jqXHR.responseText} ` +
            `(SearchURL: ${finalUrl})`)
        },
        headers: {
          'Accept-Language': this.localiser.getCurrentLang()
        }
      })
    })
  }

  getByHandle (input) {
    return new Promise((resolve, reject) => {
      let finalUrl = this.byHandleUrl_.clone().expandTemplate('searchstring', input).finalize()

      $.ajax({
        url: finalUrl,
        dataType: 'text',
        success: text => {
          let results = this.parseFeatures(text)
          resolve(this.readFeature_(results[0]))
        },
        error: (jqXHR, textStatus) => {
          reject(`Problem while trying to get search results from the Server: ${textStatus} - ${jqXHR.responseText} ` +
            `(SearchURL: ${finalUrl})`)
        },
        headers: {
          'Accept-Language': this.localiser.getCurrentLang()
        }
      })
    })
  }

  /**
   * @param {object} data
   * @returns {ol.Feature}
   * @protected
   */
  readFeature_ (data) {
    let featureOptions = {}

    if (data.hasOwnProperty('id')) {
      featureOptions.id = data.id
    }

    if (data.hasOwnProperty('name')) {
      featureOptions.name = data.name
    }

    if (data.hasOwnProperty('description')) {
      featureOptions.description = data.description
    }

    if (data.hasOwnProperty('geometry')) {
      featureOptions.geometry = this.wktParser_.readGeometry(data.geometry, {
        dataProjection: this.dataProjection,
        featureProjection: this.featureProjection
      })
    } else if ((data.hasOwnProperty('lon')) && (data.hasOwnProperty('lat'))) {
      let point = [parseFloat(data.lon), parseFloat(data.lat)]

      if (this.featureProjection) {
        point = ol.proj.transform(point, this.dataProjection, this.featureProjection)
      }

      featureOptions.geometry = new ol.geom.Point(point)
    }

    return new ol.Feature(featureOptions)
  }

  /**
   * @param {string} text
   * @returns {ol.Feature[]}
   */
  parseFeatures (text) {
    if (text[0] === '(') {
      return JSON.parse(text.substr(1, text.length - 2).replace(/"/g, '\\"').replace(/'/g, '"'))
    } else {
      return JSON.parse(text)
    }
  }

}
