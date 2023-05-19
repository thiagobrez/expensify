import React, {useEffect, useRef} from 'react';
import withWindowDimensions from '../withWindowDimensions';
import BaseModal from './BaseModal';
import {propTypes, defaultProps} from './modalPropTypes';
import * as StyleUtils from '../../styles/StyleUtils';
import themeColors from '../../styles/themes/default';

const Modal = (props) => {
    const modalRef = useRef(null);

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (!props.isVisible || !modalRef.current || modalRef.current.contains(event.target) || !props.shouldCloseOnOutsideClick) {
                return;
            }

            props.onClose();
        };

        document.addEventListener('mousedown', closeOnOutsideClick);

        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
        };
    }, [props]);

    const setStatusBarColor = (color = themeColors.appBG) => {
        if (!props.fullscreen) {
            return;
        }

        // Change the color of the status bar to align with the modal's backdrop (refer to https://github.com/Expensify/App/issues/12156).
        const element = document.querySelector('meta[name=theme-color]');
        if (element) {
            element.content = color;
        }
    };

    const hideModal = () => {
        setStatusBarColor();
        props.onModalHide();
    };

    const showModal = () => {
        setStatusBarColor(StyleUtils.getThemeBackgroundColor());
        props.onModalShow();
    };

    return (
        <BaseModal
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            onModalHide={hideModal}
            onModalShow={showModal}
            ref={modalRef}
        >
            {props.children}
        </BaseModal>
    );
};

Modal.propTypes = propTypes;
Modal.defaultProps = defaultProps;
Modal.displayName = 'Modal';
export default withWindowDimensions(Modal);
