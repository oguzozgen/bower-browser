'use strict';

var _ = require('lodash');

var ignore = require('../values/ignore');
var whitelist = require('../values/whitelist');

var api = '/api/bower-component-list.json';

module.exports = [
  '$http',
  'SettingsService',
  function ($http, SettingsService) {

    var defaultParams = {
      query: '',
      page: 1,
      sorting: 'stars',
      order: 'desc'
    };

    var config = SettingsService.config;

    var service = {

      // Properties
      components: [],
      list: [],
      results: [],
      searching: false,
      loaded: false,
      loadingError: false,
      page: defaultParams.page,
      count: 0,
      pageCount: 1,
      from: 0,
      to: 0,
      limit: 20,
      sorting: defaultParams.sorting,
      order: defaultParams.order,
      query: defaultParams.query,

      // Set params and update results
      setParams: function (params) {
        var self = this;
        this.parseParams(params);
        if (!this.loaded) {
          this.fetchApi(api).success(function (data) {
            self.components = data;
            self.list = self.components;
            self.loaded = true;
            self.search();
          });
        }
        else {
          this.search();
        }
      },

      // Parse params to set correct value
      parseParams: function (params) {
        this.query = params.q !== undefined ? String(params.q) : defaultParams.query;
        this.page = params.p !== undefined ? parseInt(params.p, 10) : defaultParams.page;
        switch (params.s) {
          case 'name':
          case 'owner':
          case 'stars':
          case 'updated':
            this.sorting = params.s;
            break;
          default:
            this.sorting = defaultParams.sorting;
        }
        switch (params.o) {
          case 'asc':
          case 'desc':
            this.order = params.o;
            break;
          default:
            this.order = defaultParams.order;
        }
      },

      // Get component list from API
      fetchApi: function (url) {
        var self = this;
        this.searching = true;
        this.loadingError = false;
        return $http.get(url)
          .success(function (res) {
            self.searching = false;
            return res.data;
          })
          .error(function () {
            self.searching = false;
            self.loadingError = true;
            return false;
          });
      },

      // Search components using current condition
      search: function () {
        var list = this.components;

        list = this.filter(list, this.query);
        list = this.sort(list, this.sorting, this.order);
        list = this.prioritize(list, this.query);

        this.list = list;
        this.count = this.list.length;
        this.pageCount = Math.ceil(this.count / this.limit);
        this.from = (this.page - 1) * this.limit + 1;
        this.to =  this.from + this.limit > this.count ? this.count : this.from + this.limit;
        this.results = this.list.slice(this.from - 1, this.to);
      },

      // Filter items by query and config
      filter: function (items, query) {
        var list = _.filter(items, function (item) {
          if (config.ignoreDeprecatedPackages) {
            if (ignore.indexOf(item.name) !== -1) {
              return false;
            }
            if (_.isString(item.website) && typeof whitelist[item.website] !== 'undefined') {
              if (item.name !== whitelist[item.website]) {
                return false;
              }
            }
          }
          if (query === '') {
            return true;
          }
          if ((config.searchField.name && item.name.indexOf(query.toLowerCase()) !== -1) ||
              (config.searchField.description && item.description && item.description.indexOf(query.toLowerCase()) !== -1) ||
              (config.searchField.owner && item.owner.indexOf(query.toLowerCase()) !== -1)) {
            return true;
          }
          return false;
        });
        return list;
      },

      // Sort items
      sort: function (items, sorting, order) {
        var list = _.sortBy(items, function (item) {
          return item[sorting];
        });
        if (order === 'desc') {
          list = list.reverse();
        }
        return list;
      },

      // Prioritize exact match
      prioritize: function (items, query) {
        if (!config.exactMatch || !config.searchField.name) {
          return items;
        }
        var list = items;
        var match = _.findIndex(list, function (item) {
          return query.toLowerCase() === item.name.toLowerCase();
        });
        if (match !== -1) {
          list.splice(0, 0, list.splice(match, 1)[0]);
        }
        return list;
      }

    };

    return service;

  }
];
