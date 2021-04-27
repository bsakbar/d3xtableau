'use strict';
(function() {

    let removeEventListener;
    let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function() {
            const savedSheetName = "D3 DATA (2)"
            const search_data_sheet = "Search Performance by Partner"
            
            loadSelectedMarks(savedSheetName, search_data_sheet);

        }, function(err) {
            // Something went wrong in initialization.
            console.log('Error while Initializing: ' + err.toString());
        });
    });


    function loadSelectedMarks(worksheetName, search_data) {
        if (removeEventListener) {
            removeEventListener();
        }

        const worksheet = demoHelpers.getSelectedSheet(worksheetName);
        const worksheet_2 = demoHelpers.getSelectedSheet(search_data);

        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
         for (let i=0; i < worksheets.length; i++){
        //    console.log(worksheets[i].name)
         }
         var unique_partners = [];
         worksheet_2.getSummaryDataAsync().then(function(sumdata) {
            const worksheetData = sumdata.data;
            for ( let i=0; i < worksheetData.length;i++){
                let partner_name = worksheetData[i][0].value
                if (unique_partners.includes(partner_name)){
                    return null
                } else {
                    unique_partners.push(partner_name)
                }
            }
           return null 
        });
         console.log('search array', unique_partners)


        worksheet.getSummaryDataAsync().then(function(sumdata) {
            const worksheetData = sumdata;
            console.log(worksheetData)
            
            var cols = [];
            
            worksheetData.columns.map(d => {
                cols.push(d.fieldName);
               })
               
               // console.log(cols)
               
            let newArr = [];
            let dataJson;
            let partnerList = {}
            worksheetData.data.map(d => {
                // dataJson needs to stay inside the mapping function
                dataJson = {};
                for (let i=0; i < cols.length; i++){
                    if (cols[i].includes("SUM(Impressions)")){
                        dataJson[cols[i]] = !isNaN(d[i].value) ? d[i].value : 0;
                       } else {
                           dataJson[cols[i]] = d[i].value;
                       }
                   }
                   
                  
                   // checkboxes should update to reflect those paths
                   newArr.push(dataJson)     
                   if (dataJson['Partner'] in partnerList) {
                       return 'none'
                   }   else {
                       partnerList[dataJson['Partner']] = 0
                   }

               });
           console.log('newArr2' ,newArr)    
           let partners = [];
           console.log('partner list yaya!!!', partnerList)
           for (const [key, value] of Object.entries(partnerList))
               partners.push(key)

            let filtered_partners = [];
               for ( let i=0; i < unique_partners.length;i++){
                if (partners.includes(unique_partners[i])){
                    filtered_partners.push(unique_partners[i])
                } else {
                    console.log('no match')
                }
            }
            console.log('filtered_partners',filtered_partners)
           let sums = {};
           let i;
           for (i = 0; i < newArr.length; i++) {
             var impressions = newArr[i]["SUM(Impressions)"]
             var clicks = newArr[i]["SUM(Clicks)"]
             var ctr = newArr[i]["AGG(3. CTR)"]
             var date = newArr[i]["Week Commencing"]
             var partner = newArr[i]["Partner"]
             var video_type = newArr[i]["Video Type"]
             var vcr = newArr[i]["AGG(4. VCR)"]
             var video_plays = newArr[i]["SUM(Video Plays)"]
             var measured_impressions = newArr[i]["SUM(Measured Impressions)"]
             var client = newArr[i]["Client "]
             var eng_rate = newArr[i]["AGG(Social Engagement Rate)"]

             var partner_date = partner + '_' + date
               // console.log('partner_date', partner_date)
               // console.log('sums object', sums)
               if (partner_date in sums) {
                   sums[partner_date]['impressions'] += impressions
                   sums[partner_date]['ctr'] += ctr
                   sums[partner_date]['clicks'] += clicks
                   // sums[newArr[i].date]['partner'] += partner

               } else {
                   sums[partner_date] = {
                       "impressions": impressions,
                       "ctr": ctr,
                       "clicks": clicks,
                       "partner": partner,
                       "date": date
                   }
               }
           }
           console.log('sumsusmsusmsusms', sums)
           var sumsArr = []
           for (const [key, value] of Object.entries(sums))
               sumsArr.push(value)

           sumsArr.sort((a, b) => (a.date > b.date) ? 1 : -1)

           console.log('sumsArr',sumsArr);

           drawDotChart(sumsArr, filtered_partners);


       });


        worksheet.getSelectedMarksAsync().then((marks) => {
            demoHelpers.populateDataTable(marks, filterByColumn);
        });

        const marksSelectedEventHandler = (event) => {
            loadSelectedMarks(worksheetName);
        }
        // removeEventListener = worksheet.addEventListener(
        //     tableau.TableauEventType.MarkSelectionChanged, marksSelectedEventHandler);

        removeEventListener = worksheet.addEventListener(
            tableau.TableauEventType.FilterChanged, marksSelectedEventHandler);
    }



    function filterByColumn(columnIndex, fieldName) {
        const columnValues = demoHelpers.getValuesInColumn(columnIndex);
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        // console.log(worksheets)
        // console.log(worksheet)

        worksheets[0].applyFilterAsync(fieldName, columnValues, tableau.FilterUpdateType.Replace);

        filteredColumns.push(fieldName);
    }

    function resetFilters() {
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        filteredColumns.forEach((columnName) => {
            worksheet.clearFilterAsync(columnName);
        });

        filteredColumns = [];
    }

    function drawDotChart(arr, partnersArr) {
        $('#wrapper').empty();

        var area_chart_elem = []
        for (let j=0; j < partnersArr.length ; j++){
            area_chart_elem.push([])
        }

       for ( let i=0; i < arr.length ; i++){
           for (let j=0; j < partnersArr.length ; j++){
                if (arr[i].partner == partnersArr[j] ){
                    area_chart_elem[j].push(arr[i])
                }
            }
       }
       

        const dateParser = d3.timeParse("%Y-%m-%d")
        const formatDate = d3.timeFormat("%b %-d, %Y")
        // const formatDate = d3.timeFormat("%b %d")
        const formatDate2 = d3.timeFormat("%b %d")
        const xAccessor = d => dateParser(d.date)
        const yAccessor = d => d.impressions
        const y2Accessor = d => d.ctr
        const clicks = d => d.clicks
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const partners = d => d.partner
        const capitalizeFirstLetter = d => d.charAt(0).toUpperCase() + d.slice(1);

       var colors = ["#5EC7EB","#4e79a7","#d93251","#43beb8"];

       var filtered_arr = []
       for ( let i=0; i < arr.length ; i++){
        for (let j=0; j < partnersArr.length ; j++){
             if (arr[i].partner == partnersArr[j] ){
                filtered_arr.push(arr[i])
             }
         }
    }

        console.log("filtered_arr",filtered_arr)

        const width = d3.min([
            window.innerWidth * 0.95,
        ])
        const height = d3.min([
            window.innerHeight * 0.85,
        ])


        let dimensions = {
            width: width,
            height: height,
            margin: {
                top: 10,
                right: 50,
                bottom: 30,
                left: 50,
            },
        }
        dimensions.boundedWidth = dimensions.width -
            dimensions.margin.right -
            dimensions.margin.left
        dimensions.boundedHeight = dimensions.height -
            dimensions.margin.top -
            dimensions.margin.bottom

        // LEGEND // 

        var legends = d3.select("#legend")
        .append("div")
        .attr("class", "legend_container")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

        var legend_div = legends.append("svg")
        .attr("width", dimensions.width)
        .attr("height", "30px")
        
        var legend_keys = partnersArr

        var legend_colorScale = d3.scaleOrdinal()
        .domain(legend_keys)
        .range(colors)

        var txt_width_so_far = 0
        var txt_width = [0];
        for ( let i=0 ; i < legend_keys.length ; i++){
            let c = legend_keys[i].length
            txt_width_so_far += c + 2
            txt_width.push(txt_width_so_far)
        }

        let area_ids = []
        let checkbox_ids = [] 

        for (let i = 0; i < area_chart_elem.length; i++){
            let checkbox_id = "checkbox_" + i
            checkbox_ids.push(checkbox_id)
        }

      
        let dim = 10
        legend_div.selectAll("keys")
        .data(legend_keys)
        .enter()
        .append("rect")
            .attr("x",function(d, i){ return 25 + txt_width[i]* 6.5})
            .attr("y", 10) 
            .attr("width", dim)
            .attr("height", dim)
            .attr("id",function(d, i){checkbox_ids[i]})
            .attr("class", "legend_container")
            .style("fill", legend_colorScale)
        .on("click", function(d, i){
            let currentColor =  d3.select(this).style("opacity") 
            d3.select(this).transition().style("opacity", currentColor == 0.4 ? 1 : 0.4);
            let currentOpacity = d3.select("#area_"+ [i]).style("opacity")
                d3.select("#area_" + [i]).transition().style("opacity", currentOpacity == 0.8 ? 0:0.8)
            
        })

        .on("mouseover", function(d) {
            d3.select(this).style("cursor", "pointer"); 
          })
        .on("mouseout", function(d) {
        d3.select(this).style("cursor", "default"); 
        })

        legend_div.selectAll("labels")
        .data(legend_keys)
        .enter()
        .append("text")
        .attr("y", 19)
        .attr("x",function(d, i){ return 38 + txt_width[i] * 6.5})
            .style("fill", "#1b261c")
            .text(function(d){ return capitalizeFirstLetter(d)})       
            .attr("text-anchor", "left")
            .attr("class", "legend_label")


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

         console.log(area_chart_elem)

        const div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const xScale = d3.scaleTime()
            .domain(d3.extent(filtered_arr, xAccessor))
            .range([0, dimensions.boundedWidth])

        const yScale = d3.scaleLinear()
            .domain(d3.extent(filtered_arr, yAccessor))
            .range([dimensions.boundedHeight, 0])
            .nice()

        const y2Scale = d3.scaleLinear()
            .domain(d3.extent(filtered_arr, y2Accessor))
            .range([dimensions.boundedHeight, 0])
            // .nice()

        const b_sizze = d3.scaleLinear()
            .domain(d3.extent(filtered_arr, clicks))
            .range([2, 8])


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
            .call(y2_gridlines()
                .tickSize(dimensions.boundedWidth)
                .tickFormat("")
            )

        const curve = d3.curveLinear



        function mouseOn(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 0.7)
            div.html("Impressions: " + add_commas(d.impressions) + "<br/>" + "CTR: " + (d.ctr*10).toFixed(1) + "%" + "<br/>" + "Clicks: " + add_commas(d.clicks) + "</br>" + "Date: " + d.date)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOut(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
                .style("opacity", 0.3)
        };

        function mouseOnLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 0.3)
            div.html("Partner: " + capitalizeFirstLetter(d.partner)  + "<br/>" + "Impressions: " + add_commas(d.impressions) + "</br>" + "CTR: " + Math.round(d.ctr) + "%" + "</br>" + "Date: " + d.date)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOutLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
            .style("opacity", 0);
        };

        var clip = bounds.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", dimensions.boundedWidth)
            .attr("height", dimensions.boundedHeight)
            .attr("stroke","none")
            .attr("x", 0)
            .attr("y", 0);

        var brush = d3.brushX()
            .extent([
                [0, 0],
                [dimensions.boundedWidth, dimensions.boundedHeight]
            ])
            .on("end", updateChart)

        var area = bounds.append("g")
            .attr("class","areas")
            .attr("clip-path", "url(#clip)")

     


        const mainPath = d3.area()
            .x(d => xScale(xAccessor(d)))
            .y0(yScale(0))
            .y1(d => yScale(yAccessor(d)))
            .curve(curve)


   
            // create an id for every path
        let area_id;
        for (let i = 0; i < area_chart_elem.length; i++){
            area_id = "area_" + i
            area_ids.push(area_id)
        }

        var chart_colorScale = d3.scaleOrdinal()
        .domain(area_chart_elem)
        .range(colors)

        // loop through area chart elem array to create a path for every partners
    for ( let i = 0; i < area_chart_elem.length; i++){  
        // console.log(area_chart_elem[i])   
        area.append("path")
            .datum(area_chart_elem[i])
            .transition()
            .duration(800)
            .attr("opacity",0)
            .attr("id", area_ids[i])
            .attr("class", "areaGroup")
            .transition()
            .duration(800)
            .attr("fill", chart_colorScale)
            .attr("opacity", 0.8)
            .attr("d", mainPath)     
    }

        area
        .append("g")
        .attr("class", "brush")
        .call(brush);

    
         area.selectAll("line")
            .data(filtered_arr)
            .enter()
            .append("line")
            .attr("stroke-width", "2px")
            .attr("stroke","#1b2326")
            .style("opacity",0)
            .attr("x1", d => xScale(xAccessor(d)))
            .attr("y1", d => yScale(yAccessor(d)))
            .attr("x2",d => xScale(xAccessor(d)))
            .attr("y2",dimensions.boundedHeight);
    
         area.selectAll("line")
             .on("mouseover", mouseOnLine)
             .on("mouseout", mouseOutLine);

        const curve2 = d3.curveLinear

        const line1 = d3.line()
            .x(d => xScale(xAccessor(d)))
            .y(d => y2Scale(y2Accessor(d)))
            .curve(curve2)

        area.append("path")
            .data(filtered_arr)
            .attr("class", "ctrLine")
            .attr("fill", 'none')
            .attr("stroke-width","0.4px")
            .attr("stroke", "#1B2326")
            .attr("opacity", 0.7)
            .attr("d", line1(filtered_arr))


        area.selectAll("circle")
           .data(filtered_arr)
           .enter()
           .append("circle")
           .attr("class", "endPoints")
           .attr("fill", "#1B2326")
           .style("opacity", 0.3)
           .attr("stroke", "none")
           .attr("cx", d => xScale(xAccessor(d)))
           .attr("cy", d => y2Scale(y2Accessor(d)))
           .attr("r", d => b_sizze(clicks(d)))

        area.selectAll("circle")
            .on("mouseover", mouseOn)
            .on("mouseout", mouseOut);

        // area.selectAll("path")
        //     .on("mouseover", highlight)
        //     .on("mouseout", noHighlight);

        let average_y2 = d3.mean(filtered_arr, y2Accessor).toFixed(2);
      
        const avgLine_y = bounds.append("line")
            .attr("y1", y2Scale(average_y2))
            .attr("y2", y2Scale(average_y2))
            .attr("x1", 0)
            .attr("x2", dimensions.boundedWidth)
            .attr("stroke", "#1B2326")
            .attr("stroke-width", "1px")
            .attr("weight", 3)
            .attr("stroke-dasharray", "5px 5px")

        const avgLabel_y = bounds.append("text")
            .attr("y", y2Scale(average_y2) - 5)
            .attr("x", 10)
            .style("font-weight", "bold")
            .text("Avg CTR:")
            .attr("fill", "#1B2326")
            .style("font-size", "10px")
            .attr("font-family", "Arial")

        // var roundNo_2 = d3.format(10 + "%");

        const avgLabel_y_2 = bounds
            .append("g")
        avgLabel_y_2
            .selectAll("text")
            .data(arr)
            .enter()
            .append("text")
            .text(Math.round(average_y2) + "%")
            .attr("y", y2Scale(average_y2) + 15)
            .attr("x", 10)
            .style("font-size", "10px")
            .attr("font-family", "Arial")
            .attr("fill", "#1B2326")


        var idleTimeout

        function idled() {
            idleTimeout = null;
        }

        function updateChart() {

            // What are the selected boundaries?
            var extent = d3.event.selection

            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if (!extent) {
                if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
                xScale.domain([4, 8])
            } else {
                xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])])
                area.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
            }

            // Update axis and area position
            xAxis.transition().duration(1000).call(
              d3.axisBottom(xScale)
              .ticks(10)
              .tickFormat(formatDate2))


            area
                .selectAll('.areaGroup')
                .transition()
                .duration(1000)
                .attr("d", mainPath)
         
        }

        bounds.on("dblclick", function() {
            xScale.domain(d3.extent(filtered_arr, xAccessor))
            xAxis.transition().call(d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(formatDate))
            area
                .selectAll('.areaGroup')
                .transition()
                .attr("d", mainPath)
 

        });

        const remove_zero = d => (d / 1e6) + "M";

        const yAxisGenerator = d3.axisLeft()
            .scale(yScale)
            .ticks(5)
            .tickFormat(remove_zero);

        const yAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(yAxisGenerator)
            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("text-align", "left")



        const y2AxisGenerator = d3.axisRight()
            .scale(y2Scale)
            .ticks(5)
            .tickFormat(d => d  + "%");

        const y2Axis = bounds.append("g")
            .attr("class","axisLine")
            .call(y2AxisGenerator)
            .style("transform", `translateX(${
              dimensions.boundedWidth
            }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("text-align", "left")



        const xAxisGenerator = d3.axisBottom()
            .scale(xScale)
            .ticks(10)
            .tickFormat(formatDate);


        const xAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(xAxisGenerator)
            .style("transform", `translateY(${
        dimensions.boundedHeight
      }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "8")

        const xAxisLabel = xAxis.append("text")
            .attr("x", dimensions.boundedWidth / 2)
            .attr("y", dimensions.margin.bottom)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("")
            .attr("fill", "#1B2326")

        const yAxisLabel = yAxis.append("text")
            .attr("x", -dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.left + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Impressions")
            .style("transform", "rotate(-90deg)")
            .style("text-anchor", "middle")
            .style("fill", "#1B2326")

        const y2AxisLabel = y2Axis.append("text")
            .attr("x", dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.right + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("CTR")
            .style("transform", "rotate(90deg)")
            .style("text-anchor", "middle")
            .attr("fill", "#1B2326")

    }

})();
