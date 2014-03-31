/* globals nv, d3 */
function setRecapValue(id, value, unit, round, fontColor) {
  $( "#" + id + " .recap" ).text(value.toFixed(round) + " " + unit);
  $( "#" + id + " .recap" ).css("color", fontColor);
}

var thothApi = {
  uri : 'localhost:3001/api/',
  _getUri: function(params){
    var urlParams = [params.objectId, params.server, 'core', params.core, 'port', params.port, 'start', params.from_date, 'end', params.to_date, params.attribute, params.endpoint]
    var url = 'http://' + thothApi.uri + urlParams.join('/'); 
    return url;
  }
}


var chartsData = {
  query_time: {
    values: [],
    options: {
        'name' : 'Average Qtime',
        'tooltip' : 'Avg Qtime: ',
        'yLabel' : 'Avg QTime (ms)',
        'graphTitle': 'Avg query time — sec',
        'chartId' : 'query_time' ,
        'color': '#7fd5e3',
        'unit' : 'sec',
        'round' : 2
       }
  },
  query_count: {
    values: [],
    options: {
      'name' : 'Average number of queries',
      'tooltip' : 'Avg # queries: ',
      'yLabel' : 'Avg number of queries',
      'graphTitle': 'Avg number of queries',
      'chartId' : 'query_count',
      'color': '#77dba2',
      'unit' : '',
      'round' : 0
    }    
  },
  query_on_deck: {
    values: [],
    options: {
      'name' : 'Avg queries on deck',
      'tooltip' : 'Avg queries on deck: ',
      'yLabel' : 'Avg queries on deck',
      'chartId' : 'query_on_deck',
      'graphTitle': 'Avg queries on deck',
      'color': '#F4C77F',
      'unit' : '',
      'round' : 0
    }    
  }
};


var thoth = {
  dashboard: function () {
    // $.getJSON('json/distribution_qtime.json', function (data) {
    //   self._stackedLineGraph({
    //     'name' : 'Distribution of query times',
    //     'tooltip' : 'Number of queries: ',
    //     'yLabel' : 'Number of queries',
    //     'chartId' : 'query_distribution',
    //     'color': '#7fd5e3'
    //    }, data)
    // });

  },
  servers: function () {
    var self = this;

    $.getJSON(thothApi._getUri(self._getParams({objectId: 'server', attribute: 'avg', endpoint: 'qtime'})), function (data) {
      self._lineGraph(chartsData.query_time.options, data);
    }); 

    $.getJSON(thothApi._getUri(self._getParams({objectId: 'server', attribute: 'avg', endpoint: 'nqueries'})), function (data) {
      self._lineGraph(chartsData.query_count.options, data)
    }); 
    $.getJSON(thothApi._getUri(self._getParams({objectId: 'server', attribute: 'avg', endpoint: 'queriesOnDeck'})), function (data) {
      self._lineGraph(chartsData.query_on_deck.options, data)
    });     
    
  },
  pools: function () {},
  exceptions: function () {},
  queries: function () {},
  realtime: function () {},

  _getParams: function (options) {
    var form = $('#params').serializeArray();
    var params = {};
    $.each(form, function () {
      var value; 
      if (this.name.indexOf('date')!= -1)  value = new Date(
        this.value.split(' ')[0].split('-')[0],
        this.value.split(' ')[0].split('-')[1]-1,
        this.value.split(' ')[0].split('-')[2],
        this.value.split(' ')[1].split(':')[0],
        this.value.split(' ')[1].split(':')[1],
        this.value.split(' ')[1].split(':')[2])
        .toISOString() || '';
      else value = this.value || '';
      params[this.name] = value;
    });
    // Extra options
    $.each(options, function (k,v) {
      params[k] = v;
    });
    return params;
  },
  _lineGraph: function (params, data) {
    var chart = nv.models.lineChart()
      .width(400).height(200).color([params.color])
      .tooltipContent(function (key, y, e) {
        // Update values realtime
        $('#' + params.chartId + ' h3.value').html(e);
        $('#' + params.chartId + ' h3.timestamp').html(y);
        return  ' Value: '+ '<b>' + d3.round(e, 2) + '</b><br/>' + 'Time: <b>' + y + '</b></br>';
      });

    chart.yAxis.axisLabel(chart.yLabel);
    chart.yAxis.tickFormat(d3.format(',.'+ params.round +'f'));
    chart.xAxis
      .tickFormat(function (d) {
        return d3.time.format("%m/%d %H:%M:%S")(new Date(d));
      });




    var v = []
    data.values.forEach(function (val, idx) {
      v.push({x: Date.parse(val.timestamp), y: val.value});
    });

    chartsData[params.chartId].values = [{key: params.yLabel , values: v}];
    d3.select('#' + params.chartId + ' svg')
      .datum(chartsData[params.chartId].values)
      .call(chart);

    // TO REMOVE
    //setRecapValue(params.chartId + ' h2', data[0].values.slice(-1)[0].y, params.unit, params.round, params.color);
    nv.utils.windowResize(chart.update);
    return chart;
  },

  _stackedLineGraph: function (params, data) {
    var chart = nv.models.stackedAreaChart()
      .useInteractiveGuideline(true)
      .x(function (d) { return d[0]; })
      .y(function (d) { return d[1]; })
      .style("expand")
      .transitionDuration(300).width(400).height(250);

    chart.xAxis
      .tickFormat(function (d) { return d3.time.format('%x')(new Date(d)); });

    chart.yAxis.tickFormat(d3.format('d'));

    var v = []
    data.values.forEach(function (val, idx) {
      v.push({x: Date.parse(val.timestamp), y: val.value});
    });
    d3.select('#' + params.chartId)
      .datum([{key: 'chart', values: v}])
      .transition().duration(0)
      .call(chart);

    nv.utils.windowResize(chart.update);
  }

};

$('nav li').on('click', function (event) {
  event.preventDefault();
  var $el = $(this);
  var hash;
  if (event.target.nodeName === 'LI') {
    //update url hash if needed
    hash = $el.find('a').attr('href');
    location.hash = hash;
  }
  else {
    hash = $(event.target).attr('href');
  }

  hash = hash.replace('#', '');

  if ($el.hasClass('active')) {
    return;
  }
  else {
    $el.siblings('.active').removeClass('active');
    $el.addClass('active');
  }

  thoth[hash]();


});

// Listen for document click to close non-modal dialog
$(document).mousedown(function(e) {
    var clicked = $(e.target); // get the element clicked
    if (clicked.is('#lightbox')) {
      $('#lightbox').hide(); //or .fadeOut();
    } else return;
});

// Date picker
jQuery(function($){
  $('#from_date').datetimepicker({
    format:'Y-m-d h:i:s'
  });

  $('#to_date').datetimepicker({
    format:'Y-m-d h:i:s'
  });
});

function showLightBox(elem){
  var data = chartsData[elem.parentNode.parentNode.id].values;
  var params = chartsData[elem.parentNode.parentNode.id].options;
  if (data.length != 0){
    $('#lightbox').show(); // or .fadeIn();
    $('#lightboxChart h2').html(chartsData[params.chartId].options.graphTitle);
    // var chart = nv.models.lineChart()
    var chart = nv.models.lineWithFocusChart()
        .color([params.color])
        .tooltipContent(function(key, y, e) {return  params.tooltip + '<b> ' + e + '</b><br/>' + 'Time: <b>' + y + '</b></br>'  })

    chart.yAxis.axisLabel(chart.yLabel);
    chart.lines.scatter.xScale(d3.scale.linear());
    chart.xAxis
      .axisLabel('Timestamp')
      .tickFormat(function (d) {
        return d3.time.format("%m/%d %H:%M:%S")(new Date(d));
      });
    chart.x2Axis
      .tickFormat(function (d) {
        return d3.time.format("%m/%d %H:%M:%S")(new Date(d));
      });
    
    chart.yAxis.tickFormat(d3.format(',.2f'));
    chart.y2Axis.tickFormat(d3.format(',.2f'));

    d3.select('#lightboxChart svg')
      .datum(data)
      .call(chart);
  
    nv.utils.windowResize(chart.update);
  }
}



// Move to on-load
thoth.servers();
