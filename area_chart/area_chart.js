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

          var impressions = newArr[i].impressions
          var clicks = newArr[i].clicks
          var ctr = newArr[i].ctr
          var date = newArr[i].date
          var partner = newArr[i].partner

          var partner_date = partner+'_'+date

          if (partner_date in sums){
            sums[partner_date]['impressions'] += impressions
            sums[partner_date]['ctr'] += ctr
            sums[partner_date]['clicks'] += clicks
            // sums[newArr[i].date]['partner'] += partner

        } else {
             sums[partner_date] = {
               "impressions": impressions,
               "ctr": ctr,
               "clicks": clicks,
               "partner": newArr[i].partner,
               "date": newArr[i].date
            }
          }
        }
        var sumsArr = []
        for (const [key, value] of Object.entries(sums))
          sumsArr.push(value)

        sumsArr.sort((a, b) => (a.date > b.date) ? 1 : -1)

        drawDotChart(sumsArr);
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
        const average_y2 = d => Math.round(d3.mean(arr, y2Accessor));

        var arr_google = []
        var arr_bing = []
        var arr_yahoo = []
        for (var i=0; i< arr.length; i++){
          if (arr[i].partner == 'Google AdWords'){
            arr_google.push(arr[i])
          } else if (arr[i].partner == 'Bing Ads'){
            arr_bing.push(arr[i])
          } else if (arr[i].partner == 'Yahoo Gemini'){
            arr_yahoo.push(arr[i])
          }
        }


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


        function line_color_ind(d){
          if (y2Accessor(d) < average_y2(d)) {
            return "#e15759"
          } else {
            return "#4e79a7"
          };
        }


        function mouseOn(d){
          div.transition()
              .duration(200)
              .style("opacity", .9)
          d3.select(this)
              .style("opacity", .6)
          div.html(d.partner + "<br/>" + "Impressions: " + d.impressions + "<br/>" + "CTR:" + d.ctr + "<br/>" + "Clicks:" + d.clicks)
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

        var clip = bounds.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", dimensions.boundedWidth )
        .attr("height", dimensions.boundedHeight )
        .attr("x", 0)
        .attr("y", 0);

        var brush = d3.brushX()
        .extent([[0,0], [dimensions.boundedWidth,dimensions.boundedHeight]])
        .on("end", updateChart)

        var area = bounds.append("g")
        .attr("clip-path", "url(#clip)")

        const path1 = d3.area()
         .x(d => xScale(xAccessor(d)))
         .y0(yScale(0))
         .y1(d => yScale(yAccessor(d)))
         .curve(curve)

         area.append("path")
         .datum(arr_google)
         .attr("class", "area1")
         .attr("fill", "#5EC7EB")
         .attr("opacity", 0.8)

         .attr("d", path1)

         area
        .append("g")
        .attr("class", "brush")
        .call(brush);


       const path2 = d3.area()
        .x(d => xScale(xAccessor(d)))
        .y0(yScale(0))
        .y1(d => yScale(yAccessor(d)))
        .curve(curve)

        area.append("path")
        .datum(arr_bing)
        .attr("class", "area2")
        .attr("fill", '#4e79a7')
        .attr("opacity", 0.8)


        .attr("d", path2)

         area
        .append("g")
        .attr("class", "brush")
        .call(brush);


        const path3 = d3.area()
         .x(d => xScale(xAccessor(d)))
         .y0(yScale(0))
         .y1(d => yScale(yAccessor(d)))
         .curve(curve)


          area.append("path")
         .datum(arr_yahoo)
         .attr("class", "area3")
         .attr("fill", 'yellow')
         .attr("opacity", 0.8)
         .attr("d", path3)


         area
        .append("g")
        .attr("class", "brush")
        .call(brush);

        const line1 = d3.line()
         .x(d => xScale(xAccessor(d)))
         .y(d => y2Scale(y2Accessor(d)))


         area.append("path")
         .data(arr)
         .attr("class", "ctrLine")
         .attr("fill", 'none')
         .attr("stroke", line_color_ind)
         .attr("d", line1(arr))

         area.selectAll("path")
         .on("mouseover", mouseOn)
         .on("mouseout", mouseOut);

         const avgLine_y = bounds.append("line")
               .attr("y1", d => y2Scale(average_y2(d)))
               .attr("y2", d => y2Scale(average_y2(d)))
               .attr("x1", 0)
               .attr("x2", dimensions.boundedWidth)
               .attr("stroke", "green")
               .attr("stroke-dasharray", "3px 3px")

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
             xScale.domain([ xScale.invert(extent[0]), xScale.invert(extent[1])])
             area.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
           }

           // Update axis and area position
           xAxis.transition().duration(1000).call(d3.axisBottom(xScale))
           area
               .select('.area1')
               .transition()
               .duration(1000)
               .attr("d", path1)
           area
               .select('.area2')
               .transition()
               .duration(1000)
               .attr("d", path2)
           area
               .select('.area3')
               .transition()
               .duration(1000)
               .attr("d", path3)
           area
               .select('.ctrLine')
               .transition()
               .duration(1000)
               .attr("d", line1(arr))
         }

         bounds.on("dblclick",function(){
          xScale.domain(d3.extent(arr, xAccessor))
          xAxis.transition().call(d3.axisBottom(xScale))
          area
            .select('.area1')
            .transition()
            .attr("d", path1)
          area
            .select('.area2')
            .transition()
            .attr("d", path2)
          area
            .select('.area3')
            .transition()
            .attr("d", path3)
          area
            .select('.ctrLine')
            .transition()
            .attr("d", line1(arr))
        });

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
            .ticks(5)
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
