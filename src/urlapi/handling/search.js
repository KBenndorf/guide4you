/**
 * @type {URLParameter}
 */
export const searchParam = {
  keys: ['search'],
  setEvent: 'ready',
  setToMap: (map, query) => {
    if (query.isSet('search')) {
      const search = map.getControlsByName('searchControl')[0]
      if (search) {
        search.setSearchValue(query.getSanitizedVal('search'))
      }
    }
  }
}
