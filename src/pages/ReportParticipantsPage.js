import React from 'react';
import _ from 'underscore';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import Str from 'expensify-common/lib/str';
import lodashGet from 'lodash/get';
import styles from '../styles/styles';
import ONYXKEYS from '../ONYXKEYS';
import HeaderWithBackButton from '../components/HeaderWithBackButton';
import Navigation from '../libs/Navigation/Navigation';
import ScreenWrapper from '../components/ScreenWrapper';
import ROUTES from '../ROUTES';
import personalDetailsPropType from './personalDetailsPropType';
import withLocalize, {withLocalizePropTypes} from '../components/withLocalize';
import compose from '../libs/compose';
import * as ReportUtils from '../libs/ReportUtils';
import reportPropTypes from './reportPropTypes';
import withReportOrNotFound from './home/report/withReportOrNotFound';
import FullPageNotFoundView from '../components/BlockingViews/FullPageNotFoundView';
import CONST from '../CONST';
import * as UserUtils from '../libs/UserUtils';
import SelectionList from '../components/SelectionList';

const propTypes = {
    /* Onyx Props */

    /** The personal details of the person who is logged in */
    personalDetails: personalDetailsPropType,

    /** The active report */
    report: reportPropTypes.isRequired,

    /** Route params */
    route: PropTypes.shape({
        params: PropTypes.shape({
            /** Report ID passed via route r/:reportID/participants */
            reportID: PropTypes.string,
        }),
    }).isRequired,

    ...withLocalizePropTypes,
};

const defaultProps = {
    personalDetails: {},
};

/**
 * Returns all the participants in the active report
 *
 * @param {Object} report The active report object
 * @param {Object} personalDetails The personal details of the users
 * @param {Object} translate The localize
 * @return {Array}
 */
const getAllParticipants = (report, personalDetails, translate) => {
    const {participantAccountIDs} = report;

    return _.chain(participantAccountIDs)
        .map((accountID, index) => {
            const userPersonalDetail = lodashGet(personalDetails, accountID, {displayName: personalDetails.displayName || translate('common.hidden'), avatar: ''});
            const userLogin = Str.removeSMSDomain(userPersonalDetail.login || '') || translate('common.hidden');

            return {
                text: userPersonalDetail.displayName,
                alternateText: userLogin,
                keyForList: `${index}-${userLogin}`,
                accountID,
                isDisabled: ReportUtils.isOptimisticPersonalDetail(accountID),
                avatar: {
                    id: accountID,
                    source: UserUtils.getAvatar(userPersonalDetail.avatar, accountID),
                    name: userLogin,
                    type: CONST.ICON_TYPE_AVATAR,
                },
            };
        })
        .sortBy((participant) => participant.text.toLowerCase())
        .value();
};

function ReportParticipantsPage(props) {
    const participants = getAllParticipants(props.report, props.personalDetails, props.translate);

    return (
        <ScreenWrapper includeSafeAreaPaddingBottom={false}>
            <FullPageNotFoundView shouldShow={_.isEmpty(props.report) || ReportUtils.isArchivedRoom(props.report)}>
                <HeaderWithBackButton
                    title={props.translate(
                        ReportUtils.isChatRoom(props.report) || ReportUtils.isPolicyExpenseChat(props.report) || ReportUtils.isChatThread(props.report) ? 'common.members' : 'common.details',
                    )}
                />
                <View
                    pointerEvents="box-none"
                    style={[styles.containerWithSpaceBetween]}
                >
                    {Boolean(participants.length) && (
                        <SelectionList
                            disableKeyboardShortcuts
                            sections={[{data: participants, indexOffset: 0}]}
                            onSelectRow={(option) => Navigation.navigate(ROUTES.getProfileRoute(option.accountID))}
                            showScrollIndicator
                        />
                    )}
                </View>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

ReportParticipantsPage.propTypes = propTypes;
ReportParticipantsPage.defaultProps = defaultProps;
ReportParticipantsPage.displayName = 'ReportParticipantsPage';

export default compose(
    withLocalize,
    withReportOrNotFound,
    withOnyx({
        personalDetails: {
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
        },
    }),
)(ReportParticipantsPage);
