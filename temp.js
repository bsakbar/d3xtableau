'use strict';
(function() {

  let removeEventListener;
  let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function() {
          $('#reset_filters_button').click(resetFilters);
          const savedSheetName = "D3 DATA"
          loadSelectedMarks(savedSheetName);

        }, function(err) {
            // Something went wrong in initialization.
            console.log('Error while Initializing: ' + err.toString());
        });
    });


  function loadSelectedMarks(worksheetName) {
    if (removeEventListener) {
      removeEventListener();
    }

     const worksheet = demoHelpers.getSelectedSheet(worksheetName);
     const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

     // for (let i=0; i < worksheets.length; i++){
       worksheet.getSummaryDataAsync().then(function (sumdata) {
        const worksheetData = sumdata;
        console.log(worksheetData)

        let newArr = [];
        let dataJson;
        worksheetData.data.map(d => {
          dataJson = {};
          // dataJson['impressions'] = d[9].value; //1st column
          dataJson['impressions'] = !isNaN(d[9].value) ? d[9].value : 0;
          // dataJson['ctr'] = d[3].value; //2nd column
          dataJson['ctr'] = !isNaN(d[3].value) ? d[3].value : 0;
          dataJson['partner'] = d[0].value; //3rd column
          // dataJson['clicks'] = d[5].value; //4th column
          dataJson['clicks'] = !isNaN(d[5].value) ? d[5].value : 0;
          dataJson['date'] = d[2].value;

          if (dataJson['partner'] == ['Google AdWords'] ||
          dataJson['partner'] == ['Bing Ads'] ||
          dataJson['partner'] == ['Yahoo Gemini']){
            newArr.push(dataJson);
          }
          // newArr.push(dataJson);

        });



        let sums = {};
        let i;
        for (i = 0; i < newArr.length; i++){

          var impressions = !isNaN(newArr[i].impressions) ? newArr[i].impressions : 0;
          var clicks = !isNaN(newArr[i].clicks) ? newArr[i].clicks : 0;
          var ctr = !isNaN(newArr[i].ctr) ? newArr[i].ctr : 0;
          var date = newArr[i].date

          if (newArr[i].partner in sums){
            sums[newArr[i].partner]['impressions'] += impressions
            sums[newArr[i].partner]['ctr'] += ctr
            sums[newArr[i].partner]['clicks'] += clicks
            // sums[newArr[i].partner]['date'] += date

        } else {
             sums[newArr[i].partner] = {
               "impressions": impressions,
               "ctr": ctr,
               "clicks": clicks,
               "date": date,
               "partner": newArr[i].partner
            }
          }
        }
        var sumsArr = []
        for (const [key, value] of Object.entries(sums))
          sumsArr.push(value)

        var selectedpartners = []
        selectedpartners.push(sums['Google AdWords'])
        selectedpartners.push(sums['Bing Ads'])
        selectedpartners.push(sums['Yahoo Gemini'])
        console.log(newArr);
        // console.log(selectedpartners);

        drawDotChart(newArr);
        // drawDotChart(newArr);


      });

    worksheet.getSelectedMarksAsync().then((marks) => {
        demoHelpers.populateDataTable(marks, filterByColumn);
    });

    const marksSelectedEventHandler = (event) => {
      loadSelectedMarks(worksheetName);
    }
    removeEventListener = worksheet.addEventListener(
      tableau.TableauEventType.MarkSelectionChanged, marksSelectedEventHandler);
  }

  function saveSheetAndLoadSelectedMarks(worksheetName) {
    tableau.extensions.settings.set('sheet', worksheetName);
    tableau.extensions.settings.saveAsync();
    loadSelectedMarks(worksheetName);
  }

  function filterByColumn(columnIndex, fieldName) {
    const columnValues = demoHelpers.getValuesInColumn(columnIndex);
    const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));

    worksheet.applyFilterAsync(fieldName, columnValues, tableau.FilterUpdateType.Replace);

    filteredColumns.push(fieldName);
  }

  function resetFilters() {
    const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
    filteredColumns.forEach((columnName) => {
        worksheet.clearFilterAsync(columnName);
    });

    filteredColumns = [];
  }


    function drawDotChart(arr) {
      $('#wrapper').empty();
        const dateParser = d3.timeParse("%Y-%m-%d")
        const formatDate = d3.timeFormat("%B %-d, %Y")
        const xAccessor = d => dateParser(d.date)
        const yAccessor =  d => d.impressions
        const y2Accessor =  d => d.ctr
        const clicks = d => d.clicks
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const partners = d => d.partner



        function xAccessor_path(d, partner){
          if (d.partner == partner){
            return xAccessor(d)
          }
          else {
            return 0
          }
        }

        function yAccessor_path(d, partner){
          if (d.partner == partner){
            return yAccessor(d)
          }
          else {
            return 0
          }
        }

        // function color_ind(d, partner){
        //   if (d.partner == 'Google AdWords'){
        //     return '#5EC7EB'
        //   } else if (d.partner == 'Bing Ads'){
        //     return 'blue'
        //   } else {
        //     return 'red'
        //   };
        // }

        const width = d3.min([
            window.innerWidth  * 0.95,
        ])
        const height = d3.min([
            window.innerHeight * 0.8,
        ])


        let dimensions = {
            width: width,
            height: height,
            margin: {
                top: 30,
                right: 50,
                bottom: 40,
                left: 50,
            },
        }
        dimensions.boundedWidth = dimensions.width -
            dimensions.margin.right -
            dimensions.margin.left
        dimensions.boundedHeight = dimensions.height -
            dimensions.margin.top -
            dimensions.margin.bottom

        const wrapper = d3.select("#wrapper")
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        const bounds = wrapper.append("g")
            .style("transform", `translate(${
           dimensions.margin.left
         }px,${
           dimensions.margin.top
         }px)`)

         bounds.append("defs")
        .append("clipPath")
        .attr("id", "bounds-clip-path")

        const clip = bounds.append("g")
        .attr("clip-path", "url(#bounds-clip-path)")


        const div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const xScale = d3.scaleTime()
        .domain(d3.extent(arr, xAccessor))
        .range([0, dimensions.boundedWidth])

        const yScale = d3.scaleLinear()
        .domain(d3.extent(arr, yAccessor))
        .range([dimensions.boundedHeight, 0])
        .nice()

        const y2Scale = d3.scaleLinear()
        .domain(d3.extent(arr, y2Accessor))
        .range([dimensions.boundedHeight, 0])
        .nice()


        function x_gridlines() {
          return d3.axisBottom(xScale)
          .ticks(0)
        }

        function y_gridlines() {
          return d3.axisLeft(yScale)
          .ticks(10)
        }

        function y2_gridlines() {
          return d3.axisRight(y2Scale)
          .ticks(0)
        }

            bounds.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + dimensions.boundedHeight + ")")
            .call(x_gridlines()
                .tickSize(-dimensions.boundedHeight)
                .tickFormat("")
            )

            bounds.append("g")
                .attr("class", "grid")
                .call(y_gridlines()
                    .tickSize(-dimensions.boundedWidth)
                    .tickFormat("")
            )

            bounds.append("g")
                .attr("class", "grid_y2")
                // .attr("stroke-dasharray", "4px 4px")
                .call(y2_gridlines()
                    .tickSize(dimensions.boundedWidth)
                    .tickFormat("")
                    )

        const curve = d3.curveLinear




        function mouseOn(d){
          div.transition()
              .duration(200)
              .style("opacity", .9)
          d3.select(this)
              .style("opacity", .6)
          div.html(d.partner + "<br/>" + "Impressions: " + d.impressions + "<br/>" + "CTR: $" + d.ctr + "<br/>" + "Clicks:" + d.clicks)
                  .style("left", (d3.event.pageX) + "px")
                  .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOut(d){
          div.transition()
              .duration(200)
              .style("opacity", 0);
          d3.select(this)
              .style("opacity", 1)
        };



        var brush = d3.brushX()
        .extent([[0,0], [dimensions.boundedWidth,dimensions.boundedHeight]])
        .on("end", updateChart)

        const path1 = d3.area()
         .x(d => xScale(xAccessor_path(d, 'Google AdWords')))
         .y0(yScale(0))
         .y1(d => yScale(yAccessor_path(d, 'Google AdWords')))
         .curve(curve)

         bounds.append("path")
         .datum(arr)
         .attr("fill", "#5EC7EB")
         .attr("d", path1)
         .attr("class", path1)

         bounds
         .append("g")
         .attr("class", "brush")
         .call(brush);


       const path2 = d3.area()
        .x(d => xScale(xAccessor_path(d, 'Bing Ads')))
        .y0(yScale(0))
        .y1(d => yScale(yAccessor_path(d, 'Bing Ads')))
        .curve(curve)

        bounds.append("path")
        .datum(arr)
        .attr("fill", 'blue')
        .attr("d", path2);


        const path3 = d3.area()
         .x(d => xScale(xAccessor_path(d, 'Yahoo Gemini')))
         .y0(yScale(0))
         .y1(d => yScale(yAccessor_path(d, 'Yahoo Gemini')))
         .curve(curve)

         bounds.append("path")
         .datum(arr)
         .attr("fill", 'red')
         .attr("d", path3);


         // bounds.selectAll("path")
         //
         // .on("mouseover", mouseOn)
         // .on("mouseout", mouseOut);

         var idleTimeout
         function idled() { idleTimeout = null; }
         function updateChart() {

           // What are the selected boundaries?
           var extent = d3.event.selection

           // If no selection, back to initial coordinate. Otherwise, update X axis domain
           if(!extent){
             if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
             xScale.domain([ 4,8])
           }else{
             xScale.domain([ xScale.invert(extent[0]), xScale.invert(extent[1]) ])
             bounds.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
           }

           // Update axis and area position
           xAxisGenerator.transition().duration(1000).call(d3.axisBottom(xScale))
           bounds
               .select('.path1')
               .transition()
               .duration(1000)
               .attr("d", path1)
         }

        const remove_zero = d => (d / 1e4) + "K";

        const yAxisGenerator = d3.axisLeft()
            .scale(yScale)
            .ticks(5)
            .tickFormat(remove_zero);

        const yAxis = bounds.append("g")
            .call(yAxisGenerator)
            .attr("font-family", "Arial")
            .attr("font-size", "10")
            .attr("text-align","left")

        const y2AxisGenerator = d3.axisRight()
            .scale(y2Scale)
            .ticks(10)
            .tickFormat(d =>(d * 10)+ "%");

        const y2Axis = bounds.append("g")
            .call(y2AxisGenerator)
            .style("transform", `translateX(${
              dimensions.boundedWidth
            }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "10")
            .attr("text-align","left")

        const xAxisGenerator = d3.axisBottom()
            .scale(xScale)
            .ticks(10)
            .tickFormat(formatDate);

        const xAxis = bounds.append("g")
            .call(xAxisGenerator)
            .style("transform", `translateY(${
        dimensions.boundedHeight
      }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "10")

        const xAxisLabel = xAxis.append("text")
            .attr("x", dimensions.boundedWidth / 2)
            .attr("y", dimensions.margin.bottom)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("")
            .attr("fill", "black")

        const yAxisLabel = yAxis.append("text")
            .attr("x", -dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.left + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Impressions")
            .style("transform", "rotate(-90deg)")
            .style("text-anchor", "middle")
            .attr("fill", "black")

        const y2AxisLabel = y2Axis.append("text")
            .attr("x", dimensions.boundedHeight / 2 )
            .attr("y", -dimensions.margin.right + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("CTR")
            .style("transform", "rotate(90deg)")
            .style("text-anchor", "middle")
            .attr("fill", "black")

    }

})();
