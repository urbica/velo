// work with url params
const Requests = {
  QueryString(item) {
    const svalue = location.search.match(new RegExp(`[?&]${item}=([^&]*)(&?)`, 'i'));
    return svalue ? svalue[1] : svalue;
  }
};

let resizeId;
let windowWidth = window.innerWidth; // staring
let totalRoutes = 0;

window.onresize = function () {
  resizeId = setTimeout(windowResized, 1300);
};

function windowResized() {
  if (windowWidth != window.innerWidth) {
    windowWidth = window.innerWidth;
    window.location.reload();
  }
}

// detecting browser params and speed of timescale animation
let heatmapSpeed = 250,
  hourStep = 1;

// slow-slow firefix
if (bowser.firefox) {
  heatmapSpeed = 1000;
  hourStep = 4;
} // the fastest possible
if (bowser.msie || bowser.opera) {
  heatmapSpeed = 300;
  hourStep = 4;
}
// the fastest possible
if (bowser.webkit) heatmapSpeed = 180; // the fastest possible

// detecting language
const lang = detectLang();

function detectLang() {
  let tlang = 'en';
  if (Requests.QueryString('l') === 'ru') {
    tlang = 'ru';
  } else {
    const dlang = navigator.language || navigator.userLanguage;
    if (dlang == 'ru' || dlang == 'ru-RU') tlang = 'ru';
  }
  return tlang;
}

// change document title
document.title = params.labels.docTitle[lang];

// new project link text
d3.select('#new-project-link').text(params.labels.newProject[lang]);

// work on loaders
let loaderInterval; // the timeout to load
let loader = d3.select('#loader'),
  loaderWelcome = d3.select('#loader-welcome').text(params.labels.loaderWelcome[lang]),
  loaderWelcome2 = d3.select('#loader-welcome2').text(params.labels.loaderWelcome2[lang]),
  loaderProgress = d3
    .select('#loader-progress')
    .append('svg')
    .attr('width', 200)
    .attr('height', 5)
    .style({ fill: '#222222' }),
  loaderState = d3.select('#loader-state').text('');

loaderProgress
  .append('rect')
  .attr('x', 0)
  .attr('y', 0)
  .attr('height', 5)
  .attr('width', 200)
  .style('fill', params.colors.darkbg);

loaderProgress
  .append('rect')
  .attr('x', 0)
  .attr('y', 0)
  .attr('height', 5)
  .attr('width', 1)
  .style('fill', params.colors.base)
  .style('opacity', 0.8)
  .transition()
  .duration(5000)
  .attr('width', 200);

// work on about screen
d3.select(`#about-content-${lang}`).style({ display: 'block' });
d3.select('#about-title').text(params.labels.about[lang]);

// lang button
d3
  .select('#lang-btn')
  .text(() => {
    if (window.innerWidth < 750) return params.labels.switchLangShort[lang];
    return params.labels.switchLang[lang];
  })
  .on('click', () => {
    window.location.assign(lang === 'ru' ? 'index.html?l=en' : 'index.html?l=ru');
  });

ymaps.ready(() => {
  // return ''; //break

  let timerID;
  let demoTimer; // timer for demo mode
  let demoID = 0; // station code for demo mode

  let mapZoom = 12;
  let scale = 1.3;

  mapZoom = window.innerWidth > 1400 ? 13 : mapZoom;
  mapZoom = window.innerWidth > 1600 ? 14 : mapZoom;

  scale = window.innerWidth > 1000 ? 1.5 : scale;
  scale = window.innerWidth > 1400 ? 1.8 : scale;
  scale = window.innerWidth > 1580 ? 2.5 : scale;

  const mapParams = {
    center: [55.74567, 37.605515],
    type: 'yandex#satellite',
    controls: [],
    zoom: mapZoom
  };

  let routesMap = new ymaps.Map('map-routes', mapParams),
    hotMap = new ymaps.Map('map-heat', mapParams),
    mapMode = 'totals'; // map modes: 'totals' — base coloring and sizes; 'months' — starting months; 'routes' — top20 routes;

  // placemark templates
  let circleLayout = ymaps.templateLayoutFactory.createClass(
      '<div style="width: {{properties.radius2x}}px; height: {{properties.radius2x}}px; display: block; position: relative; top: -{{properties.radius}}px; left: -{{properties.radius}}px; border-radius: {{properties.radius}}px; background: {{properties.color}}; opacity: {{properties.opacity}};"></div>'
    ),
    heatMapLabel = ymaps.templateLayoutFactory.createClass(
      '<div style="width: 30px; height: 12px; display: block; font-size: 10px; color: #cccccc;">{{properties.weight}}</div>'
    );

  let heatmapStyles = [
      {
        0.1: 'rgba(0,150,200,0.1)',
        0.3: 'rgba(0,238,238,0.4)',
        0.7: 'rgba(200,200,0,0.7)',
        '1.0': 'rgba(255,44,0,0.9)'
      },
      {
        0.1: 'rgba(0,138,238,0.1)',
        0.5: 'rgba(0,188,238,0.3)',
        0.7: 'rgba(0,238,238,0.7)',
        0.9: 'rgba(0,255,255,1)'
      }
    ],
    heatmapStyle = 0;

  let heatmap;

  // stating the maximum values variables
  const maxValues = {
    bestDay: {
      // the best value of rents per day
      value: 0,
      date: ''
    },
    bestHour: {
      // the best value of rents per day
      value: 0,
      date: ''
    },
    bestStation: {
      station: '',
      value: 0
    },
    longestRoute: {
      from: '',
      to: '',
      total: 0,
      distance: 0,
      duration: 0,
      start: ''
    },
    farthestRoute: {
      from: '',
      to: '',
      total: 0,
      distance: 0,
      duration: 0,
      start: ''
    }
  };

  ymaps.modules.require(['Heatmap'], (Heatmap) => {
    heatmap = new Heatmap([]);
    // Heatmap becomes opaque
    heatmap.options.set('radius', 50);
    heatmap.options.set('opacity', 1);
    heatmap.options.set('dissipating', true);
    heatmap.options.set('gradient', heatmapStyles[heatmapStyle]);
    heatmap.setMap(hotMap);
  });

  const stationsRoutes = new ymaps.GeoObjectCollection(
    null,
    {
      opacity: 0.5
    },
    {
      balloonCloseButton: true,
      strokeColor: params.colors.route
    }
  );

  stationsRoutes.events
    .add('mouseenter', (e) => {
      // можно получить из поля 'target'.
      e.get('target').options.set('opacity', 0.8);
    })
    .add('mouseleave', (e) => {
      e.get('target').options.set('opacity', 0.5);
      tooltip.style({ visibility: 'hidden' });
    })
    .add('mousemove', (e) => {
      getTooltip(event.pageX, event.pageY, {
        first: `→ ${stations[e.get('target').properties.get('to')].name}`,
        second:
          `${e.get('target').properties.get('total')
          } (${
            Math.round(
              e.get('target').properties.get('total') /
              stations[e.get('target').properties.get('to')].total *
              100 *
              100
            ) /
            100
          }%)`
      });
    });

  const stationsPlacemarks = new ymaps.GeoObjectCollection(null, {});
  const stationsPlacemarksHeatmap = new ymaps.GeoObjectCollection(null, {});

  var routes = [],
    routesOrdered = [],
    stations = [],
    stationsOrdered = [],
    activities = [],
    activitiesTotals = [],
    activitiesTotalsDaily = []; // array with activities on map^ totals — ordered array fot path

  const weather = []; // array for weather conditions

  const startTimeMS = new Date().getTime();

  let dateFormat = d3.time.format('%Y%m%d%H'),
    dateFormatDay = d3.time.format('%Y%m%d'), // YYYYMMDDHH date format for acivity calendar
    startDate = dateFormat.parse('2014060900'),
    endDate = dateFormat.parse('2014111100'),
    allDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    tickWidth = Math.floor((window.innerWidth - 40) / allDays);
  tickWidth = tickWidth < 3 ? 3 : tickWidth; // setting the minimum tick width (for small screens);//the width of day width

  let leftOffset = (window.innerWidth - tickWidth * allDays) / 2, // the space left/right
    areaWidth = tickWidth * allDays;

  // heatmap player params
  let currentDate = startDate, // date of player
    isPlaying = false;

  const routeDescriptionTemplate = ymaps.templateLayoutFactory.createClass(
    '<div class="route-in-balloon"><div class="route-total" title="общее число прокатов">{{properties.total}}</div><div class="route-title">{{properties.nameTo}}</div><div class="route-params"><span class="route-code">#{{properties.to}}</span><span class="route-duration">{{properties.duration}} мин.</span><span class="route-distance">{{properties.distance}}</span></div></div>'
  );

  // This is the accessor function we talked about above
  const timeScalePath = d3.svg
    .line()
    .x(d => d.x)
    .y(d => d.y)
    .interpolate('basis');

  // setting width of time-scale-ares
  d3.select('#heatmap-time-scale').style({ width: `${(window.innerWidth - 40).toString()}px` });
  var panel = d3.select('#station-panel'),
    stationPanelContent = d3.select('#station-panel-content'),
    stationPanelName = d3.select('#station-title'),
    content = d3.select('#content').style({ height: '100%' }),
    tooltip = d3.select('#tooltip'),
    tooltipFirst = d3.select('#tooltipFirst'),
    tooltipSecond = d3.select('#tooltipSecond'),
    tooltipThird = d3.select('#tooltipThird'),
    timeScaleArea = d3
      .select('#heatmap-time-scale-graph')
      .style({ width: `${window.innerWidth}px` }),
    playHeatmapButton = d3.select('#heatmap-play-control'),
    svgArea = timeScaleArea
      .append('svg')
      .attr('class', '#heatmap-time-control-svg')
      .attr('width', areaWidth)
      .attr('height', 80);

  let svgAreaBg = svgArea.append('g'),
    svgAreaAxis = svgArea.append('g').attr('transform', 'translate(0,60)'),
    svgPointer = svgArea
      .append('rect')
      .attr('height', 80)
      .attr('width', 2)
      .style('fill', '#ff0000')
      .attr('x', 0)
      .attr('y', 0);

  // button-menu for small-screens
  d3.select('#menu-mode').on('click', () => {
    toggleMenu();
  });

  // button heatmap-filters
  d3.select('#heatmap-filter-icon').on('click', () => {
    heatmapFilter(true);
  });

  let heatmapInfo = d3.select('#heatmap-info'),
    heatmapInfoDate = d3.select('#heatmap-info-date'),
    heatmapInfoWeather = d3.select('#heatmap-info-weather'),
    heatmapInfoTime = d3.select('#heatmap-info-time'),
    heatmapInfoScore = d3.select('#heatmap-info-score'),
    heatmapInfoScoreDescription = d3
      .select('#heatmap-info-score-description')
      .text(params.labels.rentsPerHour[lang]);

  // binding clicks on menu items
  d3
    .select('#mode-routes')
    .text(params.labels.menuRoutes[lang])
    .on('click', () => {
      changeMode('routes');
    });
  d3
    .select('#mode-heatmap')
    .text(params.labels.menuHeatmap[lang])
    .on('click', () => {
      changeMode('heatmap');
    });
  d3
    .select('#mode-calendar')
    .text(params.labels.menuCalendar[lang])
    .on('click', () => {
      changeMode('calendar');
    });
  d3
    .select('#mode-about')
    .text(params.labels.menuAbout[lang])
    .on('click', () => {
      changeMode('about');
    });

  d3.select('#station-panel-close').on('click', () => {
    togglePanel(false);
  });

  // loading stations CSV
  d3.tsv(
    'data/stations_11.csv?sjsjsj',
    (d, i) => {
      // getting data about stations
      // stations.push();
      stations[d.Code] = {
        code: d.Code, // station code
        name: d.Name, // station name
        lon: d.Lon,
        lat: d.Lat,
        total: 0,
        totalReturns: 0,
        byHour: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        byDay: [0, 0, 0, 0, 0, 0, 0],
        byDate: [],
        routes: [],
        start: ''
      };
    },
    (d) => {
      loaderState.text(params.labels.stateLoading[lang]);

      d3.tsv(
        'data/weather2.csv',
        (d, i) => {
          weather[d.dt] = {
            dt: d.dt,
            state: d.state,
            description: { ru: d.description_ru, en: d.description_en },
            temp: parseFloat(d.temp)
          };
        },
        (d) => {
          // weather is imported, getting routes data
          importRentData();
        }
      );
    }
  );

  function importRentData() {
    let rt; // string index for routes array
    let day; // formatted date

    d3.tsv(
      'data/data_13.csv?asgssshg',
      (d) => {
        // totalcounter;
        totalRoutes++;

        rt = `${d.f}-${d.t}`; // route index
        day = dateFormat.parse(d.dt); // the date of the trip
        dte = d.dt.substr(0, 8); // unformatted date — day

        // setting hash array
        if (!routes[rt]) {
          routes[rt] = {
            from: d.f,
            to: d.t,
            total: 0,
            distance: 0,
            duration: 0,
            start: ''
          };
        }

        // counting total trips on route
        routes[rt].total++;
        routes[rt].duration += parseInt(d.l);
        routes[rt].distance += parseInt(d.d);

        // calculating total stations stats

        stations[d.f].total++;
        stations[d.t].totalReturns++;

        stations[d.f].byHour[day.getHours()]++;
        stations[d.f].byDay[day.getDay()]++;

        if (!stations[d.f].byDate[dte]) stations[d.f].byDate[dte] = 1;
        else stations[d.f].byDate[dte]++;

        routes[rt].start = routes[rt].start || day < routes[rt].start ? day : day;

        // when the station start serving
        if (!stations[d.f].start) stations[d.f].start = day;
        // stations[d.f].start = !stations[d.f].start || stations[d.f].start ? day : stations[d.f].start;

        // setting acitivity locations by dates
        if (!activities[d.dt]) activities[d.dt] = [];
        activities[d.dt].push([parseFloat(stations[d.f].lat), parseFloat(stations[d.f].lon)]);

        if (!activitiesTotalsDaily[dte]) activitiesTotalsDaily[dte] = 1;
        activitiesTotalsDaily[dte]++;

        // setting maximum values of best day
        if (maxValues.bestDay.value < activitiesTotalsDaily[dte]) {
          maxValues.bestDay.value = activitiesTotalsDaily[dte];
          maxValues.bestDay.date = day;
        }

        // setting maximum values of best day
        if (maxValues.bestHour.value < activities[d.dt]) {
          maxValues.bestHour.value = activitiesTotalsDaily[d.dt];
          maxValues.bestHour.date = day;
        }
      },
      () => {
        // data imported
        loaderState.text(params.labels.stateAnalyzing[lang]);

        const ttt = 0;
        let rt = '';

        // filling the sorted array of routes
        for (const r in routes) routesOrdered.push(routes[r]);

        // creating ordered array of stations
        for (const m in stations) {
          // filling routes ordered array
          for (const w in stations) {
            rt = `${stations[m].code}-${stations[w].code}`;
            if (routes[rt]) {
              stations[m].routes.push({
                to: routes[rt].to,
                total: +routes[rt].total,
                duration: Math.round(routes[rt].duration / routes[rt].total), // average duration of route
                distance: Math.round(routes[rt].distance / routes[rt].total) // average distance of route
              });
            }
          }

          if (stations[m].total > 0) stationsOrdered.push(stations[m]);

          // sort routes in station
          stations[m].routes.sort((a, b) =>
            // return a.total == b.total ? 0 : +(a.total < b.total) || -1;
            b.total - a.total);
        }

        stationsOrdered.sort((a, b) =>
          // return(parseInt(b.code) - parseInt(a.code));
          b.total - a.total);

        // setting max value of best station
        maxValues.bestStation = {
          value: stationsOrdered[0].total,
          station: stationsOrdered[0].code
        };

        routesOrdered.sort((a, b) =>
          (a.total == b.total ? 0 : +(a.total < b.total) || -1)
          // return (a.start > b.start);
        );

        maxValues.bestRoute = routesOrdered[0];

        loaderState.text(params.labels.stateMapping[lang]);

        // building the content
        mapStations();
        heatMapStations(); // creating heatmap
        buildTimeScale(); // building time scale control
        buildCalendar();

        // demo mode
        if (Requests.QueryString('mode') === 'demo' || Requests.QueryString('mode') === 'demo/') {
          d3.selectAll('#header').style({ display: 'none' });
          // d3.selectAll("#demo-panel").style({ display: 'block'});
          d3.selectAll('#station-panel').style({ top: '10px' });

          demoTimer = setInterval(() => {
            routesMap.setZoom(14);
            playDemo();
          }, 5000);
        }

        //                console.log(maxValues);

        // setting timer on click
        playHeatmapButton.on('click', () => {
          if (!isPlaying) {
            timerID = setInterval(() => {
              heatTimer();
              playHeatmapButton.attr('class', 'playing');
              isPlaying = true;
            }, heatmapSpeed);
          } else {
            playHeatmapButton.attr('class', 'stopped');
            isPlaying = false;
            clearInterval(timerID);
          }
        });

        loaderState.text(params.labels.stateDone[lang]);
        changeMode('routes');

        clearTimeout(loaderInterval);
        loaderInterval = setTimeout(() => {
          loader
            .transition()
            .duration(1000)
            .style({
              opacity: 0
            })
            .delay(1000)
            .remove();
          // loader.style({ display: 'none'});
        }, 1500);

        // switching the first mode
      }
    );
  }

  // the function toggling menu for small screens
  function toggleMenu() {
    if (window.innerWidth < 750) {
      const menuState = d3.select('#menu').style('visibility');
      if (menuState == 'hidden') {
        d3.select('#menu').style({ visibility: 'visible' });
      } else {
        d3.select('#menu').style({ visibility: 'hidden' });
      }
    }
  }

  // the function toggling the filter menu
  function heatmapFilter(show) {
    if (show) {
      d3.select('#heatmap-filter-btn').style({ display: 'none' });
      d3.select('#heatmap-controls').style({ display: 'block' });
    } else {
      d3.select('#heatmap-filter-btn').style({ display: 'block' });
      d3.select('#heatmap-controls').style({ display: 'none' });
    }
  }

  // the function opening/closing panels
  function togglePanel(mode) {
    if (mode && panel.style('display') == 'none') {
      panel
        .transition()
        .duration(500)
        .style({
          display: 'block',
          opacity: 1
        });
    }

    if (!mode) {
      // de-selecting placemarks, removing routes from map
      colorStations(mapMode);
      stationsRoutes.removeAll();

      panel
        .transition()
        .duration(500)
        .style({
          opacity: 0,
          display: 'none'
        });
    }
  }

  // the function gets the panel content
  function getStationPanel(code) {
    // open panel if it closed
    togglePanel(true);

    // select station
    colorStations(mapMode, code);

    const s = getStationIndex(code);
    stationPanelContent.text('');
    stationPanelName.text('');
    stationPanelName
      .append('div')
      .attr('id', 'station-title-name')
      .text(stationsOrdered[s].name);

    stationPanelName
      .append('div')
      .attr('id', 'station-title-description')
      .text(`#${code} / ${humanDate(stations[code].start, true)}`);

    //    stationPanel.append("div").attr("id", "station-title").text(stationsOrdered[s].name);

    const titleHeight = document.getElementById('station-panel-title').clientHeight;

    const days = (endDate.getTime() - stations[code].start.getTime()) / (1000 * 60 * 60 * 24); // how many days station worked
    const maxDay = d3.max(stations[code].byDay);
    const maxHour = d3.max(stations[code].byHour);

    // adding totals in the panel
    d3.select('#station-total-score-value').text(stations[code].total);
    d3.select('#station-total-score-description').text(params.labels.totalTrips[lang]);

    d3
      .select('#station-total-perday-value')
      .text(Math.round(stations[code].total / days * 10) / 10);
    d3.select('#station-total-perday-description').text(params.labels.rentsPerDay[lang]);

    d3
      .select('#station-total-percent-value')
      .text(Math.round(stations[code].total / totalRoutes * 1000) / 10);
    d3.select('#station-total-percent-description').text(`${params.labels.totalTrips[lang]}, %`);

    // setting the content panel
    /* var titleHeight = document.getElementById("station-panel-title").clientHeight;
        if(titleHeight<100) titleHeight = 150;
        stationPanelContent.style({
            height: (window.innerHeight-200-titleHeight) + "px"
        });
*/
    // if the screen is too small do not add addiotional content into panel
    if (window.innerWidth < 700 || window.innerHeight < 400) {
      stationPanelContent.text('');
      stationPanelContent.style({ display: 'none' });
    } else {
      // adding routes
      stationPanelContent
        .append('div')
        .attr('class', 'station-subtitle')
        .text(params.labels.activitiesByDay[lang]);
      const graphByDays = stationPanelContent
        .append('svg')
        .attr('width', 300)
        .attr('height', 100);

      // adding routes
      stationPanelContent
        .append('div')
        .attr('class', 'station-subtitle')
        .text(params.labels.activitiesByHour[lang]);
      const graphByHours = stationPanelContent
        .append('svg')
        .attr('width', 300)
        .attr('height', 100);

      // y-scale function (for both graphs
      const y = d3.scale.linear().range([80, 0]);

      y.domain([0, 100]);

      const yAxisDay = d3.svg
        .axis()
        .scale(y)
        .orient('left');

      params.days.forEach((d, i) => {
        graphByDays
          .append('rect')
          .attr('width', 40)
          .attr('height', () => stations[code].byDay[d.num] / maxDay * 80)
          .attr('x', 42 * i)
          .attr('y', () => 80 - stations[code].byDay[d.num] / maxDay * 80)
          .style('fill', params.colors.base)
          .style('opacity', 0.6)
          .on('mousemove', function () {
            getTooltip(event.pageX, event.pageY, {
              first: Math.floor(stations[code].byDay[d.num] / days * 10) / 10
            });
            d3.select(this).style('opacity', 0.9);
          })
          .on('mouseout', function () {
            tooltip.style('visibility', 'hidden');
            d3.select(this).style('opacity', 0.6);
          })
          .on('click', () => {
            getTooltip(event.pageX, event.pageY, {
              first: Math.floor(stations[code].byDay[d.num] / days * 10) / 10
            });
          });
        graphByDays
          .append('text')
          .attr('class', 'tick-day')
          .attr('text-anchor', 'middle')
          .attr('x', 42 * i + 21)
          .attr('y', 95)
          .text(d[lang]);
      });

      stations[code].byHour.forEach((d, i) => {
        graphByHours
          .append('rect')
          .attr('width', 11)
          .attr('height', () => d / maxHour * 80)
          .attr('x', 12 * i)
          .attr('y', () => 80 - d / maxHour * 80)
          .style('fill', params.colors.base)
          .style('opacity', 0.6)
          .on('mousemove', function () {
            getTooltip(event.pageX, event.pageY, {
              first: Math.floor(stations[code].byHour[i] / days * 10) / 10
            });
            d3.select(this).style('opacity', 0.9);
          })
          .on('mouseout', function () {
            tooltip.style('visibility', 'hidden');
            d3.select(this).style('opacity', 0.6);
          })
          .on('click', () => {
            getTooltip(event.pageX, event.pageY, {
              first: Math.floor(stations[code].byHour[i] / days * 10) / 10
            });
          });
      });

      for (let h = 0; h < 12; h++) {
        graphByHours
          .append('text')
          .attr('class', 'tick-day')
          .attr('text-anchor', 'middle')
          .attr('x', 24 * h + 6)
          .attr('y', 95)
          .text(h * 2);
      }
    }
    // adding routes
    // stationPanelContent.append("div").attr("class", "station-subtitle").text(params.labels.baseDirections[lang]);

    // clear routes
    if (stationsRoutes) stationsRoutes.removeAll();

    // getting routes in the panel and on the map
    stations[code].routes.forEach((d, i) => {
      // stationPanelContent.append("div").attr("class", "route").text(stationsOrdered[getStationIndex(d.to)].name + "(" + Math.floor((d.total/stations[code].total)*100) + ")");

      if (stations[code].code !== d.to) {
        stationsRoutes.add(
          new ymaps.Polyline(
            [
              [stationsOrdered[s].lat, stationsOrdered[s].lon],
              [
                stationsOrdered[getStationIndex(d.to)].lat,
                stationsOrdered[getStationIndex(d.to)].lon
              ]
            ],
            {
              name: `${stationsOrdered[getStationIndex(d.to)].name}(${d.total})`,
              total: d.total,
              nameTo: stations[d.to].name,
              duration: d.duration,
              distance: humanDistance(d.distance),
              to: d.to,
              from: code
              // hintContent: "→ " + stationsOrdered[getStationIndex(d.to)].name + "(" + d.total + ")"
            },
            {
              // balloonContentLayout: routeDescriptionTemplate,
              strokeWidth: d.total / 20,
              strokeColor: params.colors.route,
              strokeOpacity: 1
            }
          )
        );
      }
    });

    routesMap.geoObjects.add(stationsRoutes);
  }

  function getStationIndex(code) {
    for (const s in stationsOrdered) {
      if (stationsOrdered[s].code === code) return s;
    }
  }

  function humanDistance(meters) {
    if (lang === 'ru') {
      if (meters < 1000) return `${meters} м.`;
      if (meters < 10000) return `${Math.round(meters / 100) / 10} км.`;
      if (meters < 100000) return `${Math.round(meters / 1000)} км.`;
    } else {
      if (meters < 1000) return `${meters} m.`;
      if (meters < 10000) return `${Math.round(meters / 100) / 10} km.`;
      if (meters < 100000) return `${Math.round(meters / 1000)} km.`;
    }
  }

  function mapStations() {
    // base template

    stationsOrdered.forEach((station, i) => {
      let w = 10; // default minimum size of station point
      w = Math.floor(Math.sqrt(station.total * scale) / 3);

      if (w > 0) {
        const pl = new ymaps.Placemark(
          [station.lat, station.lon],
          {
            code: station.code,
            // hintContent: station.code + ': ' + station.name + ' — ' + station.total,
            radius: w,
            radius2x: w * 2,
            id: station.code,
            opacity: 0.65,
            color: params.colors.base
          },
          {
            iconLayout: circleLayout,
            iconShape: {
              type: 'Circle',
              coordinates: [0, 0],
              radius: w
            }
          }
        );

        pl.events
          .add('click', (e) => {
            getStationPanel(e.get('target').properties.get('id'));
            getTooltip(event.pageX, event.pageY, {
              first: `${station.name}(#${station.code})`,
              second: station.total,
              third: params.labels.totalTrips[lang]
            });
          })
          .add('mousemove', (e) => {
            e.get('target').properties.set('opacity', 0.9);
            getTooltip(event.pageX, event.pageY, {
              first: `${station.name}(#${station.code})`,
              second: station.total,
              third: params.labels.totalTrips[lang]
            });
          })
          .add('mouseleave', (e) => {
            e.get('target').properties.set('opacity', 0.65);
            tooltip.style({ visibility: 'hidden' });
          });

        // pl = new ymaps.Placemark([station.lat, station.lon]);
        //                pl.events.add('click', function (e) {
        //                    stationsPlacemarks.removeAll();
        //                });

        stationsPlacemarks.add(pl);
      }
    });

    // coloring stations by selected mode (TEMPORARY!)
    colorStations(mapMode);

    // adding objects on map
    routesMap.geoObjects.add(stationsPlacemarks);
  }

  function colorStations(mode, code) {
    const month = 0;

    // setting the proper control selected
    d3.selectAll('.map-control-selected').attr('class', 'map-control');
    d3.select(`#map-mode-${mode}`).attr('class', 'map-control-selected');

    stationsPlacemarks.each((item) => {
      // base coloring
      if (mode == 'totals') {
        item.properties.set('color', params.colors.base);
      }

      if (mode == 'months') {
        const month = stations[item.properties.get('code')].start.getMonth();
        item.properties.set('color', params.colors.months[month]);
      }

      // mark selected station by code
      if (item.properties.get('code') == code) item.properties.set('color', params.colors.selected);
    });

    if (mode == 'routes' && !code) {
      stationsRoutes.removeAll();

      for (let r = 0; r < 200; r++) {
        const route = routesOrdered[r];

        stationsRoutes.add(
          new ymaps.Polyline(
            [
              [stations[route.from].lat, stations[route.from].lon],
              [stations[route.to].lat, stations[route.to].lon]
            ],
            {
              name: '',
              total: '',
              nameTo: stations[route.to].name,
              duration: route.duration,
              distance: humanDistance(route.distance),
              to: route.to,
              from: route.from
              // hintContent: "→ " + stationsOrdered[getStationIndex(d.to)].name + "(" + d.total + ")"
            },
            {
              // balloonContentLayout: routeDescriptionTemplate,
              strokeWidth: route.total / 40,
              strokeColor: params.colors.route,
              strokeOpacity: 1
            }
          )
        );
      }
      routesMap.geoObjects.add(stationsRoutes);
    }
  }

  function heatTimer() {
    currentDate = new Date(currentDate.getTime() + 1000 * 60 * 60 * hourStep);
    svgPointer.attr('x', dateToPixels(currentDate, areaWidth)); // moving the pointer
    if (currentDate.getTime() > endDate.getTime()) currentDate = startDate;
    heatMapActivity(dateFormat(currentDate)); // getting the heatmap of the hour YYYYMMDDHH
  }

  function playDemo() {
    routesMap.panTo([+stationsOrdered[demoID].lat, +stationsOrdered[demoID].lon], {
      duration: 1000
    });
    getStationPanel(stationsOrdered[demoID].code);
    demoID++;
    if (demoID > 30) demoID = 0;
  }

  function buildTimeScale() {
    // calculate width of time scale
    activitiesTotals = [];

    // filling the array for line
    for (const av in activities) {
      activitiesTotals.push({
        x: dateToPixels(dateFormat.parse(av.toString()), areaWidth),
        y: 58 - activities[av].length / 5
      });
    }

    svgAreaBg
      .append('path')
      .attr('d', timeScalePath(activitiesTotals))
      .attr('stroke', '#dddddd')
      .attr('stroke-width', 0.8)
      .attr('fill', 'none');

    svgArea
      .on('mousemove', function (z) {
        getTooltip(event.pageX, event.pageY, {
          first: humanDate(pixelsToDate(d3.mouse(this)[0], areaWidth))
        });
        svgPointer.attr('x', d3.mouse(this)[0]);
      })
      .on('mouseout', function (d, i) {
        tooltip.style('visibility', 'hidden');
        svgPointer.attr('x', dateToPixels(currentDate, areaWidth));
        d3.select(this).attr('stroke-width', 0);
      })
      .on('click', function (z) {
        // calculate date for pixel coordinates
        svgPointer.attr('x', d3.mouse(this)[0]);
        currentDate = pixelsToDate(d3.mouse(this)[0], d3.select(this).attr('width'));
        heatMapActivity(dateFormat(pixelsToDate(d3.mouse(this)[0], d3.select(this).attr('width'))));
      });

    getTimeScale(svgAreaAxis, tickWidth);

    d3
      .select('#total-heatmap')
      .text(params.labels.totalHeatmap[lang])
      .on('click', () => {
        heatMapStations();
      });

    d3
      .select('#heatmap-controls-days')
      .append('div')
      .attr('class', 'control-description')
      .text(params.labels.hcDays[lang]);

    // adding heatmap controls (by hour, by day)
    for (const d in params.days) {
      d3
        .select('#heatmap-controls-days')
        .append('div')
        .attr('id', `byDay-${params.days[d].num}`)
        .attr('class', 'control')
        .text(params.days[d][lang])
        .on('click', function () {
          d3.selectAll('.control').attr('class', 'control');
          d3.select('.control-selected').attr('class', 'control');
          d3.select(this).attr('class', 'control-selected');
          heatmapInfo.style({ visibility: 'hidden' });
          heatMapStations(d3.select(this).attr('id'));
        });
    }

    d3
      .select('#heatmap-controls-hours')
      .append('div')
      .attr('class', 'control-description')
      .text(params.labels.hcHours[lang]);

    // adding control by hour
    for (let h = 0; h < 12; h++) {
      d3
        .select('#heatmap-controls-hours')
        .append('div')
        .attr('class', 'control')
        .attr('id', `byHour-${h * 2}`)
        .text(`${h * 2}:00`)
        .on('click', function () {
          d3.selectAll('.control').attr('class', 'control');
          d3.select('.control-selected').attr('class', 'control');
          d3.select(this).attr('class', 'control-selected');
          heatmapInfo.style({ visibility: 'hidden' });
          heatMapStations(d3.select(this).attr('id'));
        });
    }
  }

  function getTooltip(x, y, t) {
    tooltip.style('top', `${y + 15}px`).style('left', `${x + 15}px`);
    if (x > window.innerWidth - 100) tooltip.style('margin-left', `${x - window.innerWidth}px`);
    else tooltip.style('margin-left', '0px');

    tooltip.style('visibility', 'visible');
    tooltipFirst.text(t.first ? t.first : '');
    tooltipSecond.text(t.second ? t.second : '');
    tooltipThird.text(t.third ? t.third : '');
  }

  // function converts pixelt to date
  function pixelsToDate(px, areaWidth) {
    // calculate milliseconds
    const ms = Math.floor((endDate.getTime() - startDate.getTime()) * (px / areaWidth));
    return new Date(startDate.getTime() + ms);
  }

  function dateToPixels(dt, areaWidth) {
    return (dt - startDate) / (endDate - startDate) * areaWidth;
  }

  function humanDate(date, short) {
    if (short) return `${date.getDate()} ${params.months[date.getMonth()].short[lang]}`;
    let d = date.getDay();
    d = d < 1 ? 6 : d - 1;
    return (
      `${date.getDate()} ${params.months[date.getMonth()].long[lang]} ${params.days[d][lang]}`
    );
  }

  function heatMapActivity(dt) {
    d3.select('.control-selected').attr('class', 'control');

    if (activities[dt]) {
      heatmapInfo.style({ visibility: 'visible' });
      heatmapInfoScore.text(activities[dt].length);
      heatmapInfoDate.text(humanDate(currentDate));
      heatmapInfoWeather.text(
        `${weather[dateFormatDay(currentDate)].temp
        }°C, ${
          weather[dateFormatDay(currentDate)].description[lang]}`
      );
      heatmapInfoTime.text(`${currentDate.getHours()}:00`);
      heatmap.setData(activities[dt]);
    } else {
      heatmapInfoScore.text('0');
      heatmapInfoDate.text(humanDate(currentDate));
      heatmapInfoWeather.text(
        `${weather[dateFormatDay(currentDate)].temp
        }°C, ${
          weather[dateFormatDay(currentDate)].description[lang]}`
      );
      heatmapInfoTime.text(`${currentDate.getHours()}:00`);
      heatmap.setData([]);
      // heatmapInfo.style({visibility: "hidden"});
    }
  }

  function heatMapStations(mode) {
    if (window.innerWidth < 700) {
      heatmapFilter(false);
    }

    // remove prev heatmap potints
    // stationsPlacemarksHeatmap.removeAll();

    // stopping the animation if it is playing
    if (isPlaying) {
      playHeatmapButton.attr('class', 'stopped');
      isPlaying = false;
      clearInterval(timerID);
    }

    // the mode expected as 'byHour-23' or 'byDay-4'
    let by,
      val;
    let minWeight = 15;

    if (mode) {
      const splittedMode = mode.split('-');
      by = splittedMode[0];
      val = splittedMode[1];
      if (by == 'byDay') minWeight = 50; // hack to show byDay difference on heatmap
    } else {
      d3.select('.control-selected').attr('class', 'control');
      d3.select('#total-heatmap').attr('class', 'control-selected');
    }

    let weight;
    const points = {
      type: 'FeatureCollection',
      features: []
    };

    stationsOrdered.forEach((d, i) => {
      if (!mode) {
        weight = d.total;
      } else weight = d[by][val];

      if (weight > minWeight) {
        points.features.push({
          id: i,
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [d.lat, d.lon]
          },
          properties: {
            weight
          }
        });
      }

      // adding placemarks to heatmap
      /*
            stationsPlacemarksHeatmap.add(new ymaps.Placemark([d.lat, d.lon],
                {
                    hintContent: d.code + ': ' + d.name + ' — ' + d.total,
                    total: d.total,
                    weight: weight
                    }, {
                    iconLayout: heatMapLabel,
                    iconShape: {
                        type: 'Rectangle',
                        coordinates: [
                            [-15, -6], [15, 6]
                        ]
                    }


                }));
            */
    });

    //        hotMap.geoObjects.add(stationsPlacemarksHeatmap);

    heatmap.setData(points);
  }

  // the mode switcher (routes|heatmap|calendar)
  function buildCalendar() {
    // d3.select("#calendar-content").append("h2").attr("class", "calendar-title").text("Активность по часам");

    // building activity graph area
    let activitySvg = d3
        .select('#calendar-content')
        .append('svg')
        .attr('width', window.innerWidth)
        .attr('height', stationsOrdered.length * 16 + 320),
      activityGraphYAxis = activitySvg.append('g'),
      activityGraphYAxisWeather = activitySvg.append('g'),
      activityGraphBars = activitySvg
        .append('g')
        .attr('transform', `translate(${leftOffset},0)`),
      activityGraphArea = activitySvg
        .append('g')
        .attr('transform', `translate(${leftOffset},0)`),
      activityTimeScale = activitySvg
        .append('g')
        .attr('transform', `translate(${leftOffset},260)`);
    getTimeScale(activityTimeScale, tickWidth);

    activityGraphArea
      .append('rect')
      .attr('width', tickWidth * allDays)
      .attr('height', 250)
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', '#333333')
      .style('opacity', 0.2);

    const activityGraphPointer = activityGraphArea.append('line');

    activityGraphPointer
      .attr('class', 'graph-pointer')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', 260)
      .style('stroke', '#f0f0f0')
      .style('opacity', 1);

    const activityDaily = [];
    for (const av in activitiesTotalsDaily) {
      if (dateFormatDay.parse(av).getTime() > startDate.getTime()) {
        activityDaily.push({
          x: dateToPixels(dateFormatDay.parse(av), tickWidth * allDays), // +tickWidth/2,
          y: 250 - activitiesTotalsDaily[av] / maxValues.bestDay.value * 250
        });
      }
    }

    const yScale = d3.scale
      .linear()
      .range([250, 0])
      .domain([0, maxValues.bestDay.value]);
    const yAxis = d3.svg
      .axis()
      .scale(yScale)
      .orient('left');

    activityGraphYAxis
      .attr('class', 'y axis')
      .call(yAxis)
      .attr('transform', `translate(${leftOffset},0)`);

    activityDaily.sort((a, b) => a.x - b.x);

    // adding bars to graph
    activityDaily.forEach((d, i) => {
      activityGraphBars
        .append('rect')
        .attr('x', (i + 1) * tickWidth)
        .attr('y', d.y)
        .attr('width', tickWidth - 1)
        .attr('height', 250 - d.y)
        .style('fill', params.colors.base)
        .style('opacity', 1 - d.y / 250);
    });

    // filling the array for line
    /*        var activityLine = activityGraphArea.append("path")
            .attr("d", timeScalePath(activityDaily))
            .style("stroke", "#81D0D0")
            .style("stroke-width", 2)
            .style("fill", "none");

*/
    // buildind weather graph

    const weatherDaily = [];
    for (const w in weather) {
      if (dateFormatDay.parse(w).getTime() > startDate.getTime()) {
        weatherDaily.push({
          x: dateToPixels(dateFormatDay.parse(w), tickWidth * allDays) + tickWidth / 2,
          y: 250 - (weather[w].temp + 10) / 45 * 250
        });
        if (weather[w].state === 'rain') {
          activityGraphArea
            .append('circle')
            .style('fill', '#459FEB')
            .style('opacity', 0.8)
            .attr('cx', dateToPixels(dateFormatDay.parse(w), tickWidth * allDays) + tickWidth / 2)
            .attr('cy', 250)
            .attr('r', tickWidth / 2 - 0.5);
        }
      }
    }

    const weatherLine = activityGraphArea
      .append('path')
      .attr('d', timeScalePath(weatherDaily))
      .style('stroke', params.colors.selected)
      .style('stroke-width', 1.5)
      .style('opacity', 0.75)
      .style('fill', 'none');

    let yScaleWeather = d3.scale
        .linear()
        .range([250, 0])
        .domain([-10, 35]),
      yAxisWeather = d3.svg
        .axis()
        .scale(yScaleWeather)
        .orient('right');

    activityGraphYAxisWeather
      .attr('class', 'y axis-weather')
      .call(yAxisWeather)
      .attr('transform', `translate(${tickWidth * allDays + leftOffset},0)`);

    activityGraphArea
      .on('mousemove', function (z) {
        // console.log('event');
        getTooltip(event.pageX, event.pageY, {
          first: humanDate(pixelsToDate(d3.mouse(this)[0], tickWidth * allDays)),
          second:
            activitiesTotalsDaily[
              dateFormatDay(pixelsToDate(d3.mouse(this)[0], tickWidth * allDays))
            ],
          third:
            `${weather[dateFormatDay(pixelsToDate(d3.mouse(this)[0], tickWidth * allDays))].temp
            }°C, ${
              weather[dateFormatDay(pixelsToDate(d3.mouse(this)[0], tickWidth * allDays))]
                .description[lang]}`
        });
        activityGraphPointer
          .attr('x1', event.pageX - leftOffset)
          .attr('x2', event.pageX - leftOffset)
          .style('opacity', 0.5);
      })
      .on('click', function (z) {
        getTooltip(event.pageX, event.pageY, {
          first: humanDate(pixelsToDate(d3.mouse(this)[0], tickWidth * allDays)),
          second:
            activitiesTotalsDaily[
              dateFormatDay(pixelsToDate(d3.mouse(this)[0], tickWidth * allDays))
            ],
          third:
            `${weather[dateFormatDay(pixelsToDate(d3.mouse(this)[0], tickWidth * allDays))].temp
            }°C, ${
              weather[dateFormatDay(pixelsToDate(d3.mouse(this)[0], tickWidth * allDays))]
                .description[lang]}`
        });
        activityGraphPointer
          .attr('x1', event.pageX - leftOffset)
          .attr('x2', event.pageX - leftOffset)
          .style('opacity', 0.5);
      })
      .on('mouseout', (d, i) => {
        tooltip.style('visibility', 'hidden');
        activityGraphPointer.style('opacity', 0);
        // svgPointer.attr("x", dateToPixels(currentDate,areaWidth));
        // d3.select(this).attr("stroke-width", 0);
      });

    // adding the legend on graph area
    activityGraphArea
      .append('path')
      .attr('d', 'M20,20L40,20')
      .attr('stroke-width', 2)
      .attr('stroke', '#81D0D0');

    activityGraphArea
      .append('path')
      .attr('d', 'M20,40L40,40')
      .attr('stroke-width', 2)
      .attr('stroke', params.colors.selected);

    activityGraphArea
      .append('text')
      .attr('x', 50)
      .attr('y', 23)
      .attr('class', 'tick-day')
      .style('fill', '#f0f0f0')
      .attr('text-anchor', 'start')
      .text(params.labels.activity[lang]);

    activityGraphArea
      .append('text')
      .attr('x', 50)
      .attr('y', 43)
      .attr('class', 'tick-day')
      .style('fill', '#f0f0f0')
      .attr('text-anchor', 'start')
      .text(params.labels.temperature[lang]);

    activityGraphArea
      .append('text')
      .attr('x', 50)
      .attr('y', 63)
      .attr('class', 'tick-day')
      .style('fill', '#f0f0f0')
      .attr('text-anchor', 'start')
      .text(params.labels.rain[lang]);

    activityGraphArea
      .append('circle')
      .style('fill', '#459FEB')
      .style('opacity', 0.8)
      .attr('cx', 35)
      .attr('cy', 60)
      .attr('r', 4);

    // d3.select("#calendar-content").append("h2").attr("class", "calendar-title").text("Загрузка станций");

    const calendarTimeScaleSvg = d3.select('#calendar-header').append('svg');
    const calendarTimeScaleArea = calendarTimeScaleSvg
      .append('g')
      .attr('width', window.innerWidth - leftOffset * 2)
      .attr('height', 320);
    const calendarContentArea = activitySvg.append('g').attr('transform', 'translate(0,285)');

    // building time scale
    calendarTimeScaleSvg.attr('height', 30).attr('width', window.innerWidth);

    calendarTimeScaleArea.attr('transform', `translate(${leftOffset}, 0)`);
    getTimeScale(calendarTimeScaleArea, tickWidth, true); // getting the time scale
    calendarTimeScaleArea
      .on('mousemove', function (z) {
        getTooltip(event.pageX, event.pageY, {
          first: humanDate(pixelsToDate(d3.mouse(this)[0], d3.select(this).attr('width')))
        });
      })
      .on('mouseout', (d, i) => {
        tooltip.style('visibility', 'hidden');
      });

    // building the content
    calendarContentArea
      .attr('width', window.innerWidth)
      .attr('height', 16 * stationsOrdered.length + 60);

    const calendarContentSvgTimeScale = activitySvg
      .append('g')
      .attr(
        'transform',
        `translate (${leftOffset},${16 * stationsOrdered.length + 290})`
      );
    getTimeScale(calendarContentSvgTimeScale, tickWidth);

    // sorting stations by start date
    stationsOrdered.sort((a, b) => b.total - a.total);

    //        stationsOrdered.sort();

    stationsOrdered.forEach((station, i) => {
      const row = calendarContentArea.append('g').attr('class', 'row');
      // if station has a date of start
      if (station.start) {
        row
          .append('text')
          .attr('x', leftOffset - 5)
          .attr('class', 'tick-day')
          .attr('y', i * 16 + 16)
          .style('fill', '#f0f0f0')
          .attr('text-anchor', 'end')
          .text(station.code); // getting short human readable date

        for (const dt in station.byDate) {
          var ddd = dateFormatDay.parse(dt);
          if (ddd >= startDate) {
            row
              .append('rect')
            // .style("fill", getPointColor(station.byDate[dt]))
              .style('fill', params.colors.base)
              .attr('r', tickWidth / 2 - 0.5)
              .attr('id', `${station.code}|${dt}|${station.byDate[dt]}`)
              .attr('class', 'circle')
              .attr('opacity', station.byDate[dt] / 100)
            // .attr("opacity",1)
              .attr('x', () => {
                const x = Math.floor(
                  (ddd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) * tickWidth
                );
                return x + leftOffset;
              })
              .attr('y', i * 16 + tickWidth / 2)
              .attr('height', 15)
              .attr('width', tickWidth - 1)
              .on('mousemove', function (z) {
                const prm = d3
                  .select(this)
                  .attr('id')
                  .split('|');
                getTooltip(event.pageX, event.pageY, {
                  first: humanDate(dateFormatDay.parse(prm[1])),
                  second: prm[2],
                  third: `${prm[0]}: ${stations[prm[0]].name}`
                });
              })
              .on('click', function (z) {
                const prm = d3
                  .select(this)
                  .attr('id')
                  .split('|');
                getTooltip(event.pageX, event.pageY, {
                  first: humanDate(dateFormatDay.parse(prm[1])),
                  second: prm[2],
                  third: `${prm[0]}: ${stations[prm[0]].name}`
                });
              })
              .on('mouseout', (d, i) => {
                tooltip.style('visibility', 'hidden');
              });
          }
        }
      }
    });
  }

  function getTimeScale(area, tick, reverse) {
    // calculate day bar width
    area.attr('width', tick * allDays);

    for (let day = 0; day < allDays; day++) {
      var dayDate = new Date(startDate.getTime() + day * 1000 * 60 * 60 * 24);
      let dy = 0;
      if (reverse) {
        dy = 25;
      }

      area
        .append('rect')
        .attr('width', tick - 1)
        .attr('height', 5)
        .style('fill', '#ffffff')
        .style('opacity', () => {
          if (dayDate.getDay() > 0 && dayDate.getDay() < 6) return 0.2;
          return 0.5;
        })
        .attr('x', day * tick)
        .attr('y', 0 + dy);

      //           # svg:line x1="0" y1="0" x2="0" y2="0"
      if (dayDate.getDay() === 1) {
        area
          .append('line')
          .attr('x1', day * tick)
          .attr('x2', day * tick)
          .attr('y1', 0 + dy)
          .attr('y2', 5 + dy)
          .style('stroke-width', 1)
          .style('stroke', '#eeeeee');

        area
          .append('text')
          .attr('x', day * tick)
          .attr('y', 18)
          .attr('class', 'tick-day')
          .style('fill', '#f0f0f0')
          .attr('text-anchor', 'middle')
          .text(humanDate(pixelsToDate(day * tick, area.attr('width')), true)); // getting short human readable date
      }
    }
  }

  function changeMode(mode) {
    d3.selectAll('.menu-item-selected').attr('class', 'menu-item');
    d3.select(`#mode-${mode}`).attr('class', 'menu-item-selected');

    // toggling pages
    d3.selectAll('.page').style({ display: 'none' });
    d3.select(`#${mode}-page`).style({ display: 'block' });

    // toggle mobile menu
    if (window.innerWidth < 750) {
      toggleMenu();
    }

    if (mode == 'routes') {
      d3.select('#menu-mode').text(params.labels.menuRoutes[lang]);
      d3.select('#calendar-header').style({ display: 'none' });
      d3.select('#heatmap-page').style({ display: 'none' });
      d3.select('#calendar-page').style({ display: 'none' });
      d3.select('#about-page').style({ display: 'none' });
    }

    if (mode == 'heatmap') {
      d3.select('#menu-mode').text(params.labels.menuHeatmap[lang]);
      d3.select('#calendar-header').style({ display: 'none' });
      d3.select('#routes-page').style({ display: 'none' });
      d3.select('#calendar-page').style({ display: 'none' });
      d3.select('#about-page').style({ display: 'none' });

      // heatmap.setData([]);
      // heatMapStations();
    }

    if (mode == 'calendar') {
      togglePanel(false);
      d3.select('#menu-mode').text(params.labels.menuCalendar[lang]);
      d3.select('#calendar-header').style({ display: 'block' });
      d3.select('#map').style({ display: 'none' });
      d3.select('#calendar').style({ display: 'block' });

      d3.select('#heatmap-page').style({ display: 'none' });
      d3.select('#routes-page').style({ display: 'none' });
      d3.select('#about-page').style({ display: 'none' });
    }

    if (mode == 'about') {
      d3.select('#menu-mode').text(params.labels.menuAbout[lang]);

      d3.select('#routes-page').style({ display: 'none' });
      d3.select('#heatmap-page').style({ display: 'none' });
      d3.select('#calendar-page').style({ display: 'none' });
    }
  }
});
