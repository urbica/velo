# Bike share stats

Here is small interactive project with bike share stats in Moscow. The project shows Moscow bike share system stats since 9 Jun to 11 Nov 2014.
The result of work: [urbica.github.io/velo/](https://urbica.github.io/velo/)

There are three modes:
Routes — clicking in stations placemarks it shows total stats, stats by hours, stats by weekdays and the most popular directions of rides from this station.
Activity — heatmaps shows how active every part of bike share coverage, you can play an animation or choose a slice of data by time, hour or by weekday.
Timeline — bike stats by day of the period. Graph shows how weather conditions influence on bike share system.

Source data is provided by [Velobike](http://velobike.ru/)

This project was built using few great tools:

- [Yandex Maps API](http://api.yandex.ru/maps) + [heatmap module](https://github.com/yandex/mapsapi-heatmap)
- [D3.js](d3js.org)
