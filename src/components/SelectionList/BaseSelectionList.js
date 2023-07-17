import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';
import _ from 'underscore';
import lodashGet from 'lodash/get';
import SectionList from '../SectionList';
import Text from '../Text';
import styles from '../../styles/styles';
import TextInput from '../TextInput';
import CONST from '../../CONST';
import variables from '../../styles/variables';
import {propTypes as selectionListPropTypes} from './selectionListPropTypes';
import RadioListItem from './RadioListItem';
import CheckboxListItem from './CheckboxListItem';
import useKeyboardShortcut from '../../hooks/useKeyboardShortcut';
import SafeAreaConsumer from '../SafeAreaConsumer';
import withKeyboardState, {keyboardStatePropTypes} from '../withKeyboardState';
import Checkbox from '../Checkbox';
import PressableWithFeedback from '../Pressable/PressableWithFeedback';
import FixedFooter from '../FixedFooter';
import Button from '../Button';
import useLocalize from '../../hooks/useLocalize';
import Log from '../../libs/Log';
import useArrowKeyFocusManager from '../../hooks/useArrowKeyFocusManager';

const propTypes = {
    ...keyboardStatePropTypes,
    ...selectionListPropTypes,
};

function BaseSelectionList({
    sections,
    canSelectMultiple = false,
    onSelectRow,
    onSelectAll,
    onDismissError,
    textInputLabel = '',
    textInputPlaceholder = '',
    textInputValue = '',
    textInputMaxLength,
    keyboardType = CONST.KEYBOARD_TYPE.DEFAULT,
    onChangeText,
    initiallyFocusedOptionKey = '',
    shouldDelayFocus = false,
    onScroll,
    onScrollBeginDrag,
    headerMessage = '',
    confirmButtonText = '',
    onConfirm,
    isKeyboardShown = false,
    disableKeyboardShortcuts = false,
}) {
    const {translate} = useLocalize();
    const listRef = useRef(null);
    const textInputRef = useRef(null);
    const focusTimeoutRef = useRef(null);
    const shouldShowTextInput = Boolean(textInputLabel);
    const shouldShowSelectAll = Boolean(onSelectAll);
    const shouldShowConfirmButton = Boolean(onConfirm);

    /**
     * Iterates through the sections and items inside each section, and builds 3 arrays along the way:
     * - `allOptions`: Contains all the items in the list, flattened, regardless of section
     * - `disabledOptionsIndexes`: Contains the indexes of all the disabled items in the list, to be used by the ArrowKeyFocusManager
     * - `itemLayouts`: Contains the layout information for each item, header and footer in the list,
     * so we can calculate the position of any given item when scrolling programmatically
     *
     * @return {{itemLayouts: [{offset: number, length: number}], disabledOptionsIndexes: *[], allOptions: *[]}}
     */
    const getFlattenedSections = () => {
        const allOptions = [];

        const disabledOptionsIndexes = [];
        let disabledIndex = 0;

        let offset = 0;
        const itemLayouts = [{length: 0, offset}];

        let selectedCount = 0;

        _.each(sections, (section, sectionIndex) => {
            const sectionHeaderHeight = variables.optionsListSectionHeaderHeight;
            itemLayouts.push({length: sectionHeaderHeight, offset});
            offset += sectionHeaderHeight;

            _.each(section.data, (item, optionIndex) => {
                // Add item to the general flattened array
                allOptions.push({
                    ...item,
                    sectionIndex,
                    index: optionIndex,
                });

                // If disabled, add to the disabled indexes array
                if (section.isDisabled || item.isDisabled) {
                    disabledOptionsIndexes.push(disabledIndex);
                }
                disabledIndex += 1;

                // Account for the height of the item in getItemLayout
                const fullItemHeight = variables.optionRowHeight;
                itemLayouts.push({length: fullItemHeight, offset});
                offset += fullItemHeight;

                if (item.isSelected) {
                    selectedCount++;
                }
            });

            // We're not rendering any section footer, but we need to push to the array
            // because React Native accounts for it in getItemLayout
            itemLayouts.push({length: 0, offset});
        });

        // We're not rendering the list footer, but we need to push to the array
        // because React Native accounts for it in getItemLayout
        itemLayouts.push({length: 0, offset});

        if (selectedCount > 1 && !canSelectMultiple) {
            Log.alert(
                'Dev error: SelectionList - multiple items are selected but prop `canSelectMultiple` is false. Please enable `canSelectMultiple` or make your list have only 1 item with `isSelected: true`.',
            );
        }

        return {
            allOptions,
            disabledOptionsIndexes,
            itemLayouts,
            allSelected: selectedCount > 0 && selectedCount === allOptions.length - disabledOptionsIndexes.length,
        };
    };

    const flattenedSections = getFlattenedSections();

    /**
     * Scrolls to the desired item index in the section list
     *
     * @param {Number} index - the index of the item to scroll to
     * @param {Boolean} animated - whether to animate the scroll
     */
    const scrollToIndex = (index, animated) => {
        const item = flattenedSections.allOptions[index];

        if (!listRef.current || !item) {
            return;
        }

        const itemIndex = item.index;
        const sectionIndex = item.sectionIndex;

        // Note: react-native's SectionList automatically strips out any empty sections.
        // So we need to reduce the sectionIndex to remove any empty sections in front of the one we're trying to scroll to.
        // Otherwise, it will cause an index-out-of-bounds error and crash the app.
        let adjustedSectionIndex = sectionIndex;
        for (let i = 0; i < sectionIndex; i++) {
            if (_.isEmpty(lodashGet(sections, `[${i}].data`))) {
                adjustedSectionIndex--;
            }
        }

        listRef.current.scrollToLocation({sectionIndex: adjustedSectionIndex, itemIndex, animated});
    };

    const [focusedIndex] = useArrowKeyFocusManager({
        maxIndex: flattenedSections.allOptions.length - 1,
        onFocusedIndexChange: (newFocusedIndex) => scrollToIndex(newFocusedIndex, true),
        initialFocusedIndex: _.findIndex(flattenedSections.allOptions, (option) => option.keyForList === initiallyFocusedOptionKey),
        disabledIndexes: flattenedSections.disabledOptionsIndexes,
        isActive: !disableKeyboardShortcuts,
    });

    /**
     * This function is used to compute the layout of any given item in our list.
     * We need to implement it so that we can programmatically scroll to items outside the virtual render window of the SectionList.
     *
     * @param {Array} data - This is the same as the data we pass into the component
     * @param {Number} flatDataArrayIndex - This index is provided by React Native, and refers to a flat array with data from all the sections. This flat array has some quirks:
     *
     *     1. It ALWAYS includes a list header and a list footer, even if we don't provide/render those.
     *     2. Each section includes a header, even if we don't provide/render one.
     *
     *     For example, given a list with two sections, two items in each section, no header, no footer, and no section headers, the flat array might look something like this:
     *
     *     [{header}, {sectionHeader}, {item}, {item}, {sectionHeader}, {item}, {item}, {footer}]
     *
     * @returns {Object}
     */
    const getItemLayout = (data, flatDataArrayIndex) => {
        const targetItem = flattenedSections.itemLayouts[flatDataArrayIndex];

        return {
            length: targetItem.length,
            offset: targetItem.offset,
            index: flatDataArrayIndex,
        };
    };

    const renderSectionHeader = ({section}) => {
        if (!section.title || _.isEmpty(section.data)) {
            return null;
        }

        return (
            // Note: The `optionsListSectionHeader` style provides an explicit height to section headers.
            // We do this so that we can reference the height in `getItemLayout` –
            // we need to know the heights of all list items up-front in order to synchronously compute the layout of any given list item.
            // So be aware that if you adjust the content of the section header (for example, change the font size), you may need to adjust this explicit height as well.
            <View style={[styles.optionsListSectionHeader, styles.justifyContentCenter]}>
                <Text style={[styles.ph5, styles.textLabelSupporting]}>{section.title}</Text>
            </View>
        );
    };

    const renderItem = ({item, index, section}) => {
        const isFocused = focusedIndex === index + lodashGet(section, 'indexOffset', 0);

        if (canSelectMultiple) {
            return (
                <CheckboxListItem
                    item={item}
                    isFocused={isFocused}
                    onSelectRow={onSelectRow}
                    onDismissError={onDismissError}
                />
            );
        }

        return (
            <RadioListItem
                item={item}
                isFocused={isFocused}
                onSelectRow={onSelectRow}
            />
        );
    };

    /** Focuses the text input when the component mounts. If `props.shouldDelayFocus` is true, we wait for the animation to finish */
    useEffect(() => {
        if (shouldShowTextInput) {
            if (shouldDelayFocus) {
                focusTimeoutRef.current = setTimeout(() => textInputRef.current.focus(), CONST.ANIMATED_TRANSITION);
            } else {
                textInputRef.current.focus();
            }
        }

        return () => {
            if (!focusTimeoutRef.current) {
                return;
            }
            clearTimeout(focusTimeoutRef.current);
        };
    }, [shouldDelayFocus, shouldShowTextInput]);

    /** Selects row when pressing enter */
    useKeyboardShortcut(
        CONST.KEYBOARD_SHORTCUTS.ENTER,
        () => {
            const focusedOption = flattenedSections.allOptions[focusedIndex];

            if (!focusedOption) {
                return;
            }

            onSelectRow(focusedOption);
        },
        {
            isActive: !disableKeyboardShortcuts,
            captureOnInputs: true,
            shouldBubble: () => !flattenedSections.allOptions[focusedIndex],
        },
    );

    return (
        <SafeAreaConsumer>
            {({safeAreaPaddingBottomStyle}) => (
                <View style={[styles.flex1, !isKeyboardShown && safeAreaPaddingBottomStyle]}>
                    {shouldShowTextInput && (
                        <View style={[styles.ph5, styles.pv5]}>
                            <TextInput
                                ref={textInputRef}
                                label={textInputLabel}
                                accessibilityLabel={textInputLabel}
                                accessibilityRole={CONST.ACCESSIBILITY_ROLE.TEXT}
                                value={textInputValue}
                                placeholder={textInputPlaceholder}
                                maxLength={textInputMaxLength}
                                onChangeText={onChangeText}
                                keyboardType={keyboardType}
                                selectTextOnFocus
                            />
                        </View>
                    )}
                    {Boolean(headerMessage) && (
                        <View style={[styles.ph5, styles.pb5]}>
                            <Text style={[styles.textLabel, styles.colorMuted]}>{headerMessage}</Text>
                        </View>
                    )}
                    {!headerMessage && canSelectMultiple && shouldShowSelectAll && (
                        <PressableWithFeedback
                            style={[styles.peopleRow, styles.userSelectNone, styles.ph5, styles.pb3]}
                            onPress={onSelectAll}
                            accessibilityLabel={translate('workspace.people.selectAll')}
                            accessibilityRole="button"
                            accessibilityState={{checked: flattenedSections.allSelected}}
                        >
                            <Checkbox
                                accessibilityLabel={translate('workspace.people.selectAll')}
                                isChecked={flattenedSections.allSelected}
                                onPress={onSelectAll}
                            />
                            <View style={[styles.flex1]}>
                                <Text style={[styles.textStrong, styles.ph5]}>{translate('workspace.people.selectAll')}</Text>
                            </View>
                        </PressableWithFeedback>
                    )}
                    <SectionList
                        ref={listRef}
                        sections={sections}
                        renderSectionHeader={renderSectionHeader}
                        renderItem={renderItem}
                        getItemLayout={getItemLayout}
                        onScroll={onScroll}
                        onScrollBeginDrag={onScrollBeginDrag}
                        keyExtractor={(item) => item.keyForList}
                        onLayout={() => scrollToIndex(focusedIndex, false)}
                        extraData={focusedIndex}
                        indicatorStyle="white"
                        keyboardShouldPersistTaps="always"
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={12}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                        viewabilityConfig={{viewAreaCoveragePercentThreshold: 95}}
                        testID="selection-list"
                    />
                    {shouldShowConfirmButton && (
                        <FixedFooter>
                            <Button
                                success
                                style={[styles.w100]}
                                text={confirmButtonText || translate('common.confirm')}
                                onPress={onConfirm}
                                pressOnEnter
                                enterKeyEventListenerPriority={1}
                            />
                        </FixedFooter>
                    )}
                </View>
            )}
        </SafeAreaConsumer>
    );
}

BaseSelectionList.displayName = 'BaseSelectionList';
BaseSelectionList.propTypes = propTypes;

export default withKeyboardState(BaseSelectionList);
