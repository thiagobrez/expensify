import React, {useCallback, useEffect, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import {withOnyx} from 'react-native-onyx';
import ONYXKEYS from '../../../../ONYXKEYS';
import * as OptionsListUtils from '../../../../libs/OptionsListUtils';
import * as ReportUtils from '../../../../libs/ReportUtils';
import * as UserUtils from '../../../../libs/UserUtils';
import CONST from '../../../../CONST';
import withLocalize, {withLocalizePropTypes} from '../../../../components/withLocalize';
import compose from '../../../../libs/compose';
import personalDetailsPropType from '../../../personalDetailsPropType';
import reportPropTypes from '../../../reportPropTypes';
import SelectionList from '../../../../components/SelectionList';

const propTypes = {
    /** Beta features list */
    betas: PropTypes.arrayOf(PropTypes.string),

    /** Callback to inform parent modal of success */
    onStepComplete: PropTypes.func.isRequired,

    /** Callback to add participants in MoneyRequestModal */
    onAddParticipants: PropTypes.func.isRequired,

    /** Selected participants from MoneyRequestModal with login */
    participants: PropTypes.arrayOf(
        PropTypes.shape({
            accountID: PropTypes.number,
            login: PropTypes.string,
            isPolicyExpenseChat: PropTypes.bool,
            isOwnPolicyExpenseChat: PropTypes.bool,
            selected: PropTypes.bool,
        }),
    ),

    /** All of the personal details for everyone */
    personalDetails: PropTypes.objectOf(personalDetailsPropType),

    /** All reports shared with the user */
    reports: PropTypes.objectOf(reportPropTypes),

    /** padding bottom style of safe area */
    safeAreaPaddingBottomStyle: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.object), PropTypes.object]),

    ...withLocalizePropTypes,
};

const defaultProps = {
    participants: [],
    betas: [],
    personalDetails: {},
    reports: {},
    safeAreaPaddingBottomStyle: {},
};

function MoneyRequestParticipantsSplitSelector({betas, participants, personalDetails, reports, translate, onAddParticipants, onStepComplete, safeAreaPaddingBottomStyle}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [newChatOptions, setNewChatOptions] = useState({
        recentReports: [],
        personalDetails: [],
        userToInvite: null,
    });

    const maxParticipantsReached = participants.length === CONST.REPORT.MAXIMUM_PARTICIPANTS;

    /**
     * Returns the sections needed for the SelectionList
     *
     * @param {Boolean} maxParticipantsReached
     * @returns {Array}
     */
    const sections = useMemo(() => {
        const newSections = [];
        let indexOffset = 0;

        const details = OptionsListUtils.getPersonalDetailsForAccountIDs(_.pluck(participants, 'accountID'), personalDetails);
        const participantsWithAvatars = _.map(participants, (participant) => {
            const detail = details[participant.accountID];

            return {
                ...participant,
                avatar: {
                    ...participant.avatar,
                    source: UserUtils.getAvatar(detail.avatar, detail.accountID),
                },
            };
        });

        newSections.push({
            title: undefined,
            data: participantsWithAvatars,
            shouldShow: true,
            indexOffset,
        });
        indexOffset += participantsWithAvatars.length;

        if (maxParticipantsReached) {
            return newSections;
        }

        newSections.push({
            title: translate('common.recents'),
            data: newChatOptions.recentReports,
            shouldShow: !_.isEmpty(newChatOptions.recentReports),
            indexOffset,
        });
        indexOffset += newChatOptions.recentReports.length;

        newSections.push({
            title: translate('common.contacts'),
            data: newChatOptions.personalDetails,
            shouldShow: !_.isEmpty(newChatOptions.personalDetails),
            indexOffset,
        });
        indexOffset += newChatOptions.personalDetails.length;

        if (newChatOptions.userToInvite && !OptionsListUtils.isCurrentUser(newChatOptions.userToInvite)) {
            newSections.push({
                undefined,
                data: [newChatOptions.userToInvite],
                shouldShow: true,
                indexOffset,
            });
        }

        return newSections;
    }, [maxParticipantsReached, newChatOptions.personalDetails, newChatOptions.recentReports, newChatOptions.userToInvite, participants, personalDetails, translate]);

    /**
     * Removes a selected option from list if already selected. If not already selected add this option to the list.
     * @param {Object} option
     */
    const toggleOption = useCallback(
        (option) => {
            const isOptionInList = _.some(participants, (selectedOption) => selectedOption.accountID === option.accountID);

            let newSelectedOptions;

            if (isOptionInList) {
                newSelectedOptions = _.reject(participants, (selectedOption) => selectedOption.accountID === option.accountID);
            } else {
                newSelectedOptions = [
                    ...participants,
                    {
                        ...option,
                        avatar: {
                            ...option.avatar,
                            // `participants` are stored in Onyx, under the `iou` key. Onyx can't merge the state
                            // if one of the properties is not serializable, so we clean the avatar source when it is a function,
                            // and restore in the `sections` memo above when rendering the list.
                            source: _.isFunction(option.avatar.source) ? '' : option.avatar.source,
                        },
                        isSelected: true,
                    },
                ];
            }

            onAddParticipants(newSelectedOptions);

            const chatOptions = OptionsListUtils.getNewChatOptions(reports, personalDetails, betas, isOptionInList ? searchTerm : '', newSelectedOptions, CONST.EXPENSIFY_EMAILS);

            const formattedRecentReports = _.map(chatOptions.recentReports, OptionsListUtils.formatMemberForList);
            const formattedPersonalDetails = _.map(chatOptions.personalDetails, OptionsListUtils.formatMemberForList);
            const formattedUserToInvite = OptionsListUtils.formatMemberForList(chatOptions.userToInvite);

            setNewChatOptions({
                recentReports: formattedRecentReports,
                personalDetails: formattedPersonalDetails,
                userToInvite: formattedUserToInvite,
            });
        },
        [searchTerm, participants, onAddParticipants, reports, personalDetails, betas, setNewChatOptions],
    );

    const headerMessage = OptionsListUtils.getHeaderMessage(
        newChatOptions.personalDetails.length + newChatOptions.recentReports.length !== 0,
        Boolean(newChatOptions.userToInvite),
        searchTerm,
        maxParticipantsReached,
        _.some(participants, (participant) => participant.text.toLowerCase().includes(searchTerm.toLowerCase())),
    );

    const isOptionsDataReady = ReportUtils.isReportDataReady() && OptionsListUtils.isPersonalDetailsReady(personalDetails);

    useEffect(() => {
        const chatOptions = OptionsListUtils.getNewChatOptions(reports, personalDetails, betas, searchTerm, participants, CONST.EXPENSIFY_EMAILS);

        const formattedRecentReports = _.map(chatOptions.recentReports, OptionsListUtils.formatMemberForList);
        const formattedPersonalDetails = _.map(chatOptions.personalDetails, OptionsListUtils.formatMemberForList);
        const formattedUserToInvite = OptionsListUtils.formatMemberForList(chatOptions.userToInvite);

        setNewChatOptions({
            recentReports: formattedRecentReports,
            personalDetails: formattedPersonalDetails,
            userToInvite: formattedUserToInvite,
        });
    }, [betas, reports, participants, personalDetails, translate, searchTerm, setNewChatOptions]);

    return (
        <SelectionList
            canSelectMultiple
            sections={sections}
            textInputLabel={translate('optionsSelector.nameEmailOrPhoneNumber')}
            textInputValue={searchTerm}
            onChangeText={setSearchTerm}
            onSelectRow={toggleOption}
            headerMessage={headerMessage}
            confirmText={translate('common.next')}
            onConfirm={onStepComplete}
            showLoadingPlaceholder={!isOptionsDataReady}
        />
    );
}

MoneyRequestParticipantsSplitSelector.propTypes = propTypes;
MoneyRequestParticipantsSplitSelector.defaultProps = defaultProps;
MoneyRequestParticipantsSplitSelector.displayName = 'MoneyRequestParticipantsSplitSelector';

export default compose(
    withLocalize,
    withOnyx({
        personalDetails: {
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
        },
        reports: {
            key: ONYXKEYS.COLLECTION.REPORT,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
    }),
)(MoneyRequestParticipantsSplitSelector);
