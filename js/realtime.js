/* globals chartsData, thothApi, d3, graphBuilder */
/* exported realtime */

var realtime = (function (graphBuilder, thothApi, chartsData, d3) {
  var graphs = [
    {data: [], attribute: 'avg',   endpoint: 'qtime',     settings: chartsData.query_time.options },
    {data: [], attribute: 'avg',   endpoint: 'nqueries',  settings: chartsData.query_time.options },
    {data: [], attribute: 'count', endpoint: 'exception', settings: chartsData.exception_count.options },
    {data: [], attribute: 'count', endpoint: 'zeroHits',  settings: chartsData.zeroHits_count.options },
  ];

  var maxPointsDisplayed =  20;

  return {

    init: function () {
      var self = this;
      var $svg = $('#realtime svg');

      $.each(graphs, function (idx, graph) {
        graph.chart = graphBuilder.lineGraph(graph.settings);
        graph.data = [];
        graph.el = $svg.get(idx);
        //self._updateGraph(graph);
      });
    },

    show: function () {
      showFormAndData('realtime');
      this.init();
      this._update();
    },

    hide: function () {
      clearInterval(this.timeout);
      $('#realtime').hide();
    },

    _update: function () {
      var self = this;

      if (typeof self.socket == 'undefined') {
        $.getScript('https://cdn.socket.io/socket.io-1.2.0.js', function(){
          self.socket = io.connect('localhost:3001');
          self._sendNewData();
        });
      }
    },

    _updateGraph: function (graph) {
      d3.select(graph.el)
        .datum([{key: graph.settings.yLabel, values: graph.data}])
        .call(graph.chart);
    },

    _getCurrentQueryParams: function () {
      return {
        server: $('[data-role=server_values_select]').val(),
        core: $('[data-role=core_values_select]').val(),
        port: $('[data-role=port_values_select]').val()
      };
    },

    _sendNewData: function () {
      var self = this;
      self.socket.emit('queryParams', self._getCurrentQueryParams());
      self.socket.on('new realtime data', function(data) {
        $.each(graphs, function (idx, graph) {
          if (data.hasOwnProperty(graph.endpoint)) {

            //self._updateGraph(graph);
            var n = 143,
              duration = 750,
              now = new Date(Date.now() - duration),
              count = 0;

            var margin = {
                top: 6,
                right: 0,
                bottom: 20,
                left: 40
              },
              width = 560 - margin.right,
              height = 120 - margin.top - margin.bottom;

            var x = d3.time.scale()
              .domain([now - (n - 2) * duration, now - duration])
              .range([0, width]);

            var y = d3.scale.linear()
              .range([height, 0]);

            var line = d3.svg.line()
              .interpolate("basis")
              .x(function (d, i) {
                return x(now - (n - 1 - i) * duration);
              })
              .y(function (d, i) {
                return y(d);
              });

            var svg = d3.select(graph.el).append("p").append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .style("margin-left", -margin.left + "px")
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append("defs").append("clipPath")
              .attr("id", "clip")
              .append("rect")
              .attr("width", width)
              .attr("height", height);

            var axis = svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(x.axis = d3.svg.axis().scale(x).orient("bottom"));

            var path = svg.append("g")
              .attr("clip-path", "url(#clip)")
              .append("path")
              .data(graph.data)
              .attr("class", "line");

            tick();

            d3.select(window)
              .on("scroll", function () {
                ++count;
              });

            function tick() {

              // update the domains
              now = new Date();
              x.domain([now - (n - 2) * duration, now - duration]);
              y.domain([0, d3.max(graph.data)]);


              // push the accumulated count onto the back, and reset the count
              graph.data.push(
                data[graph.endpoint][0].value
              );
              count = 0;

              // redraw the line
              svg.select(".line")
                .attr("d", line)
                .attr("transform", null);

              // slide the x-axis left
              axis.transition()
                .duration(duration)
                .ease("linear")
                .call(x.axis);

              // slide the line left
              path.transition()
                .duration(duration)
                .ease("linear")
                .attr("transform", "translate(" + x(now - (n - 1) * duration) + ")")
                .each("end", tick);

              // pop the old data point off the front
              graph.data.shift();

            }
          }
        });
      });
    }
  };
} (graphBuilder, thothApi, chartsData, d3));