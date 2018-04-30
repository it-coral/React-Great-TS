import * as RoutesNames from './RoutesNames';

const Names = {
    [RoutesNames.Main]: 'Home',
    [RoutesNames.Tests]: 'Tests',
    [RoutesNames.TestRun]: 'Test Run History',
    [RoutesNames.TestRunDetails]: 'Test Results',
    [RoutesNames.TestProperty]: 'Tests',
    [RoutesNames.Monitoring]: 'Monitoring',
    [RoutesNames.MonitorRun]: 'Monitor Run History',
    [RoutesNames.AnalyzeDump]: 'Analyze WebRTC Dump',
    [RoutesNames.NewTestProperty]: 'New Test Property'
};

export default Names;

export function getLocationTitle(path: string): string {
    let title = '';
    for (let name in Names) {
        if (path.includes(name)) {
            title = Names[name];
        }
    }
    return title;
}