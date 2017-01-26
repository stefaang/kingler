window.route = {
  uri: '/',
  page: 'home',
  modal: 'team'
};

Vue.mixin({
  data: function () {
    return {
      route: window.route
    }
  },
  methods: {
    routeClick(evt) {
      var page = evt.target.pathname;
      if (page.startsWith('/')) {
        page = page.slice(1)
      }
      this.route.page = page;

      console.log('router: going to page', page);

      evt.preventDefault();
    },
    someGlobalMethod() {
      //
    }
  }
});
