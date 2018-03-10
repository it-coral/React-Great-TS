export function getStat (allocation) {
    let arrayOfProbes = getArrayOfProbes(allocation);
    let groupedProbes = groupProbesByDatacenter(arrayOfProbes);
    let totalStat = countTotalStat(groupedProbes);
    groupedProbes.push(totalStat);
    return groupedProbes
}

function groupProbesByDatacenter (probes) {
  let datacenters: any = getAllDatacenters(probes)
    .map((dataCenterName) => {
      let probesByAssignment = countProbesByAssignment(probes, dataCenterName);
      let capacityByType = getTotalCapacityForDatacenter(probes, dataCenterName);
      return {
        data_center_name: dataCenterName,
        amount_of_test_probes: probesByAssignment.tests,
        amount_of_monitor_probes: probesByAssignment.monitors,
        data_center_capacity: capacityByType.all,
        dynamic_probes_capacity: capacityByType.dynamic,
        static_probes_capacity: capacityByType.static
      };
    });

    return datacenters;
}

function getTotalCapacityForDatacenter (probes, dataCenterName) {
  let probesByDC: any[] = probes.filter( aProbe => aProbe.location === dataCenterName );
  let result: any = probesByDC.reduce( (capacityStat, probe) => {
    if (probe.maxVideoSessions) {
      capacityStat.all = capacityStat.all + probe.maxVideoSessions;
      if (probe.groups.indexOf('dyn') !== -1 || probe.groups.indexOf('pdyn') !== -1) {
        capacityStat.dynamic += probesByDC.length * probe.maxVideoSessions;
      } else {
        capacityStat.static += probesByDC.length * probe.maxVideoSessions;
      }
    }

    return capacityStat;
    }, {
      all: 0,
      static: 0,
      dynamic: 0
    }
  );

  return result;
}

function getAllDatacenters (allocation) {
  return allocation.reduce((dataCenters, probe) => {
    if (dataCenters.indexOf(probe.location) === -1) {
      dataCenters.push(probe.location);
    }
    return dataCenters;
  }, []);
}

function getArrayOfProbes (allocation) {
  let probes = [];
  for (let probeName in allocation) {
    probes.push(Object.assign({
      probeName: probeName
    }, allocation[probeName]));
  }
  return probes;
}

function isItProbeForTests (sessions) {
  return sessions.filter((session) => !session.monitorId).length > 0;
}

function countProbesByAssignment (probes, dataCenterName) {
  return probes
  .filter((aProbe) => {
    return aProbe.location === dataCenterName && aProbe.sessions.length > 0;
  }).reduce((probesStat, probe) => {
    if (isItProbeForTests(probe.sessions)) {
      probesStat.tests++;
    } else {
      probesStat.monitors++;
    }
    return probesStat;
  }, {
    tests: 0,
    monitors: 0
  });
}

function countTotalStat (datacentersStat) {
  return datacentersStat.reduce(function (totalStat, datacenterStat) {
    if (datacenterStat) {
      totalStat.amount_of_monitor_probes = totalStat.amount_of_monitor_probes + datacenterStat.amount_of_monitor_probes;
      totalStat.amount_of_test_probes = totalStat.amount_of_test_probes + datacenterStat.amount_of_test_probes;
      totalStat.data_center_capacity = totalStat.data_center_capacity + datacenterStat.data_center_capacity;
      totalStat.dynamic_probes_capacity = totalStat.dynamic_probes_capacity + datacenterStat.dynamic_probes_capacity;
      totalStat.static_probes_capacity = totalStat.static_probes_capacity + datacenterStat.static_probes_capacity;
    }
    return totalStat;
  }, {
    data_center_name: 'Total',
    amount_of_monitor_probes: 0,
    amount_of_test_probes: 0,
    data_center_capacity: 0,
    dynamic_probes_capacity: 0,
    static_probes_capacity: 0
  });
}
