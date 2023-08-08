import React from 'react';
import _ from 'underscore';
import ScreenWrapper from '../../../components/ScreenWrapper';
import HeaderWithBackButton from '../../../components/HeaderWithBackButton';
import Navigation from '../../../libs/Navigation/Navigation';
import withReportOrNotFound from '../../home/report/withReportOrNotFound';
import FullPageNotFoundView from '../../../components/BlockingViews/FullPageNotFoundView';
import reportPropTypes from '../../reportPropTypes';
import ROUTES from '../../../ROUTES';
import * as Report from '../../../libs/actions/Report';
import * as ReportUtils from '../../../libs/ReportUtils';
import SelectionList from '../../../components/SelectionList';
import useLocalize from '../../../hooks/useLocalize';

const propTypes = {
    /** The report for which we are setting notification preferences */
    report: reportPropTypes.isRequired,
};

function NotificationPreferencePage(props) {
    const {translate} = useLocalize();
    const shouldDisableNotificationPreferences = ReportUtils.shouldDisableSettings(props.report) || ReportUtils.isArchivedRoom(props.report);
    const notificationPreferenceOptions = _.map(translate('notificationPreferencesPage.notificationPreferences'), (preference, key) => ({
        text: preference,
        keyForList: key,
        isSelected: key === props.report.notificationPreference,
    }));

    return (
        <ScreenWrapper includeSafeAreaPaddingBottom={false}>
            <FullPageNotFoundView shouldShow={shouldDisableNotificationPreferences}>
                <HeaderWithBackButton
                    title={translate('notificationPreferencesPage.header')}
                    onBackButtonPress={() => Navigation.goBack(ROUTES.getReportSettingsRoute(props.report.reportID))}
                />
                <SelectionList
                    sections={[{data: notificationPreferenceOptions, indexOffset: 0}]}
                    onSelectRow={(option) => Report.updateNotificationPreferenceAndNavigate(props.report.reportID, props.report.notificationPreference, option.keyForList)}
                />
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

NotificationPreferencePage.displayName = 'NotificationPreferencePage';
NotificationPreferencePage.propTypes = propTypes;

export default withReportOrNotFound(NotificationPreferencePage);
