import React from 'react';
import { shallow } from 'enzyme';
import * as MerkurIntegration from '@merkur/integration';

import {
  mockedWidgetClassName,
  mockedWidgetProperties,
  widgetMockCleanup,
  widgetMockInit,
} from '../__mocks__/widgetMock';
import MerkurComponent from '../MerkurComponent';

jest.mock('@merkur/integration', () => {
  return {
    loadScriptAssets: jest.fn(() => Promise.resolve()),
    loadStyleAssets: jest.fn(() => Promise.resolve()),
  };
});

describe('Merkur component', () => {
  let widgetProperties = null;
  let widgetClassName = null;
  let wrapper = null;

  beforeEach(() => {
    // Cache mocked widget data
    widgetClassName = mockedWidgetClassName;
    widgetProperties = mockedWidgetProperties;

    // Mock basic function so first render can pass
    jest
      .spyOn(MerkurComponent.prototype, '_isSSRHydrate')
      .mockReturnValue(false);

    // Shallow render component
    wrapper = shallow(
      <MerkurComponent widgetProperties={widgetProperties}>
        Fallback
      </MerkurComponent>
    );

    widgetMockInit();
  });

  afterEach(() => {
    widgetMockCleanup();
    jest.clearAllMocks();
  });

  describe('merkur component rendering', () => {
    it('should render nothing for not defined widgetProperties', () => {
      wrapper = shallow(
        <MerkurComponent>
          <span>Fallback</span>
        </MerkurComponent>
      );

      expect(wrapper.exists()).toBeTruthy();
    });

    it('should render merkur component for defined widgetProperties', (done) => {
      jest
        .spyOn(MerkurIntegration, 'loadScriptAssets')
        .mockImplementation(() => Promise.resolve());

      wrapper = shallow(
        <MerkurComponent
          widgetProperties={widgetProperties}
          widgetClassName={widgetClassName}>
          <span>Fallback</span>
        </MerkurComponent>
      );

      setImmediate(() => {
        expect(MerkurIntegration.loadScriptAssets).toHaveBeenCalled();
        expect(wrapper).toMatchInlineSnapshot(`
          <Fragment>
            <WidgetWrapper
              className="container"
              html="<div class=\\"merkur__page\\"></div>"
            />
          </Fragment>
        `);

        done();
      });
    });

    it('should call onWidgetMounted and onWidgetUnmouting callback', (done) => {
      const onWidgetMounted = jest.fn();
      const onWidgetUnmounting = jest.fn();

      wrapper = shallow(
        <MerkurComponent
          widgetProperties={widgetProperties}
          widgetClassName={widgetClassName}
          onWidgetMounted={onWidgetMounted}
          onWidgetUnmounting={onWidgetUnmounting}>
          <span>Fallback</span>
        </MerkurComponent>
      );

      setImmediate(() => {
        const widget = wrapper.instance()._widget;
        expect(onWidgetMounted).toHaveBeenCalledWith(widget);

        wrapper.unmount();

        setImmediate(() => {
          expect(onWidgetUnmounting).toHaveBeenCalledWith(widget);
          done();
        });
      });
    });

    it('should call onError callback and render fallback when script loading fails.', (done) => {
      jest
        .spyOn(MerkurIntegration, 'loadScriptAssets')
        .mockImplementation(() => Promise.reject('failed to load'));

      const onError = jest.fn();

      wrapper = shallow(
        <MerkurComponent
          widgetProperties={widgetProperties}
          widgetClassName={widgetClassName}
          onError={onError}>
          <span>Fallback</span>
        </MerkurComponent>
      );

      setImmediate(() => {
        expect(onError).toHaveBeenCalled();

        expect(wrapper).toMatchInlineSnapshot(`
          <span>
            Fallback
          </span>
        `);

        done();
      });
    });

    it('should load style assets on unmount', (done) => {
      jest
        .spyOn(MerkurIntegration, 'loadStyleAssets')
        .mockImplementation(() => Promise.resolve());

      wrapper = shallow(
        <MerkurComponent
          widgetProperties={widgetProperties}
          widgetClassName={widgetClassName}>
          <span>Fallback</span>
        </MerkurComponent>
      );

      setImmediate(() => {
        wrapper.unmount();

        setImmediate(() => {
          expect(MerkurIntegration.loadStyleAssets).toHaveBeenCalled();
          done();
        });
      });
    });
  });
});

describe('Merkur component methods', () => {
  let widgetProperties = null;
  let wrapper = null;
  let instance = null;

  beforeEach(() => {
    // Cache mocked widget data
    widgetProperties = mockedWidgetProperties;

    // Mock resource loading functions
    jest
      .spyOn(MerkurIntegration, 'loadStyleAssets')
      .mockImplementation(() => Promise.resolve());
    jest
      .spyOn(MerkurIntegration, 'loadScriptAssets')
      .mockImplementation(() => Promise.resolve());

    // Mock basic function so first render can pass
    jest
      .spyOn(MerkurComponent.prototype, '_isSSRHydrate')
      .mockReturnValue(false);
    jest.spyOn(MerkurComponent.prototype, '_isClient').mockReturnValue(true);
    jest
      .spyOn(MerkurComponent.prototype, '_getWidgetHTML')
      .mockReturnValue(widgetProperties.html);

    // Shallow render component
    wrapper = shallow(
      <MerkurComponent widgetProperties={widgetProperties}>
        Fallback
      </MerkurComponent>,
      { disableLifecycleMethods: true }
    );

    // Update states so widget renders
    wrapper.setState({ assetsLoaded: true });
    instance = wrapper.instance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('static hasWidgetChanged() method', () => {
    it('should return false for invalid inputs', () => {
      expect(MerkurComponent.hasWidgetChanged(null, undefined)).toBe(false);
      expect(MerkurComponent.hasWidgetChanged()).toBe(false);
      expect(MerkurComponent.hasWidgetChanged('', '')).toBe(false);
      expect(MerkurComponent.hasWidgetChanged(1, {})).toBe(false);
      expect(MerkurComponent.hasWidgetChanged({ a: 1, b: 2 })).toBe(false);
      expect(
        MerkurComponent.hasWidgetChanged(
          { name: 'name', version: 'version' },
          { a: 4, b: 5 }
        )
      ).toBe(false);
    });

    it('should return false for same widgets', () => {
      expect(
        MerkurComponent.hasWidgetChanged(
          { name: 'todo', version: '1.0.0' },
          { name: 'todo', version: '1.0.0' }
        )
      ).toBe(false);
    });

    it('should return true for different versions of the widget', () => {
      expect(
        MerkurComponent.hasWidgetChanged(
          { name: 'todo', version: '1.0.0' },
          { name: 'todo', version: '0.1.0' }
        )
      ).toBe(true);
      expect(
        MerkurComponent.hasWidgetChanged(
          { name: 'todo', version: '1.1.0' },
          { name: 'todo', version: '1.0.0' }
        )
      ).toBe(true);
    });

    it('should return true for different widgets', () => {
      expect(
        MerkurComponent.hasWidgetChanged(
          { name: 'articles', version: '1.0.0' },
          { name: 'todo', version: '0.1.0' }
        )
      ).toBe(true);
      expect(
        MerkurComponent.hasWidgetChanged(
          { name: 'todos', version: '1.0.0' },
          { name: 'todo', version: '1.0.0' }
        )
      ).toBe(true);
    });
  });

  describe('static getDerivedStateFromProps() method', () => {
    it('should return null if there are no next widgetProperties', () => {
      expect(
        MerkurComponent.getDerivedStateFromProps({
          color: 'blue',
          size: 'large',
        })
      ).toBe(null);
      expect(MerkurComponent.getDerivedStateFromProps()).toBe(null);
      expect(MerkurComponent.getDerivedStateFromProps(null, null)).toBe(null);
      expect(
        MerkurComponent.getDerivedStateFromProps(null, { widgetProperties: {} })
      ).toBe(null);
      expect(
        MerkurComponent.getDerivedStateFromProps({ widgetProperties: {} })
      ).toBe(null);
    });

    it('should cache widget metadata on receiving widget properties for the first time', () => {
      expect(
        MerkurComponent.getDerivedStateFromProps(
          {
            widgetProperties,
          },
          { cachedWidgetMeta: null }
        )
      ).toEqual({
        cachedWidgetMeta: {
          name: widgetProperties.name,
          version: widgetProperties.version,
        },
      });
    });

    it('should return null for following calls after widget meta are already cached and not changed', () => {
      expect(
        MerkurComponent.getDerivedStateFromProps(
          {
            widgetProperties,
          },
          { cachedWidgetMeta: null }
        )
      ).toEqual({
        cachedWidgetMeta: {
          name: widgetProperties.name,
          version: widgetProperties.version,
        },
      });

      expect(
        MerkurComponent.getDerivedStateFromProps(
          {
            widgetProperties,
          },
          {
            cachedWidgetMeta: {
              name: widgetProperties.name,
              version: widgetProperties.version,
            },
          }
        )
      ).toBe(null);
    });

    it('should re-cache widget metadata on receiving new widget properties, that changed and reset state.', () => {
      let newWidgetProperties = {
        name: 'todos',
        version: '1.0.0',
      };

      expect(
        MerkurComponent.getDerivedStateFromProps(
          {
            widgetProperties: newWidgetProperties,
          },
          {
            cachedWidgetMeta: {
              name: widgetProperties.name,
              version: widgetProperties.version,
            },
          }
        )
      ).toEqual({
        encounteredError: false,
        assetsLoaded: false,
        cachedWidgetMeta: {
          name: newWidgetProperties.name,
          version: newWidgetProperties.version,
        },
      });
    });
  });

  describe('shouldComponentUpdate() method', () => {
    it('should always return false when widgetProperties are defined, except for specific cases', () => {
      let defaultState = wrapper.state();

      expect(
        instance.shouldComponentUpdate({ widgetProperties }, defaultState)
      ).toBe(false);
      expect(
        instance.shouldComponentUpdate(
          { a: 'test', b: 'new props' },
          defaultState
        )
      ).toBe(false);
      expect(
        instance.shouldComponentUpdate(
          {},
          {
            ...defaultState,
            newStateKey: 1,
            thisShouldBeIgnored: true,
          }
        )
      ).toBe(false);
      expect(
        instance.shouldComponentUpdate(
          {
            ...widgetProperties,
            sameProps: 'with new keys and values',
            butStill: 'the same name or version',
          },
          defaultState
        )
      ).toBe(false);
    });

    it('should return true when widgetProperties are not defined', () => {
      wrapper.setProps({ widgetProperties: null });

      expect(instance.shouldComponentUpdate({}, wrapper.state())).toBe(true);
    });

    it('should return true when encounteredError flag changes', () => {
      let defaultState = wrapper.state();

      expect(
        instance.shouldComponentUpdate(
          { widgetProperties },
          {
            ...defaultState,
            encounteredError: !defaultState.encounteredError,
          }
        )
      ).toBe(true);
    });

    it('should return true when assetsLoaded flag changes', () => {
      let defaultState = wrapper.state();

      expect(
        instance.shouldComponentUpdate(
          { widgetProperties },
          {
            ...defaultState,
            assetsLoaded: !defaultState.assetsLoaded,
          }
        )
      ).toBe(true);
    });

    it('should return true when widget name or version changes', () => {
      expect(
        instance.shouldComponentUpdate(
          {
            widgetProperties: {
              ...widgetProperties,
              name: widgetProperties.name,
              version: '1.2.3',
            },
          },
          wrapper.state()
        )
      ).toBe(true);

      expect(
        instance.shouldComponentUpdate(
          {
            widgetProperties: {
              ...widgetProperties,
              name: 'newName',
              version: widgetProperties.version,
            },
          },
          wrapper.state()
        )
      ).toBe(true);

      expect(
        instance.shouldComponentUpdate(
          {
            widgetProperties: {
              ...widgetProperties,
              name: 'newName',
              version: '1.5.6',
            },
          },
          wrapper.state()
        )
      ).toBe(true);
    });
  });

  describe('componentDidMount() method', () => {
    it('should load widget assets upon mounting', () => {
      spyOn(instance, '_loadWidgetAssets');

      instance.componentDidMount();

      expect(instance._loadWidgetAssets).toHaveBeenCalledTimes(1);
    });

    it('should set _isMounted flag to true', () => {
      instance._isMounted = false;
      expect(instance._isMounted).toBe(false);

      instance.componentDidMount();

      expect(instance._isMounted).toBe(true);
    });
  });

  describe('componentDidUpdate() method', () => {
    beforeEach(() => {
      spyOn(instance, '_mountWidget').and.stub();
      spyOn(instance, '_removeWidget').and.stub();
      spyOn(instance, '_loadWidgetAssets').and.stub();
      spyOn(instance, 'setState').and.callThrough();
    });

    it('should try to mount the widget if assets have been loaded', () => {
      wrapper.setState({ assetsLoaded: true });

      instance.componentDidUpdate(
        { widgetProperties },
        { assetsLoaded: false }
      );

      expect(instance._mountWidget).toHaveBeenCalledTimes(1);
      expect(instance._removeWidget).not.toHaveBeenCalled();
      expect(instance._loadWidgetAssets).not.toHaveBeenCalled();
    });

    it('should not try to mount the widget if assetsLoaded changed but are not true', () => {
      wrapper.setState({ assetsLoaded: false });

      instance.componentDidUpdate({ widgetProperties }, { assetsLoaded: true });

      expect(instance._mountWidget).not.toHaveBeenCalled();
      expect(instance._removeWidget).not.toHaveBeenCalled();
      expect(instance._loadWidgetAssets).not.toHaveBeenCalled();
    });

    it('should not try to mount the widget if anything else in the state changed', () => {
      instance.componentDidUpdate(
        { widgetProperties },
        { ...wrapper.state(), somethingElseChanged: true }
      );

      expect(instance._mountWidget).not.toHaveBeenCalled();
      expect(instance._removeWidget).not.toHaveBeenCalled();
      expect(instance._loadWidgetAssets).not.toHaveBeenCalled();
      expect(instance.setState).not.toHaveBeenCalled();
    });

    it('should remove current widget and reset state, if widgetProperties are deleted', () => {
      wrapper.setProps({ widgetProperties: null });

      instance.componentDidUpdate({ widgetProperties }, wrapper.state());

      expect(instance._mountWidget).not.toHaveBeenCalled();
      expect(instance._loadWidgetAssets).not.toHaveBeenCalled();
      expect(instance._removeWidget).toHaveBeenCalledTimes(1);
      expect(instance.setState).toHaveBeenCalledTimes(1);
      expect(instance.setState).toHaveBeenCalledWith({
        assetsLoaded: false,
        encounteredError: false,
        cachedWidgetMeta: null,
      });
    });

    it('should start loading widget assets for new widget properties', () => {
      wrapper.setProps({
        widgetProperties,
      });

      instance.componentDidUpdate({ widgetProperties: null }, wrapper.state());

      expect(instance._loadWidgetAssets).toHaveBeenCalledTimes(1);
      expect(instance._mountWidget).not.toHaveBeenCalled();
      expect(instance._removeWidget).not.toHaveBeenCalled();
      expect(instance.setState).not.toHaveBeenCalled();
    });

    it('should remove old widget and start loading new one', () => {
      wrapper.setProps({
        widgetProperties,
      });

      instance.componentDidUpdate(
        {
          widgetProperties: {
            ...widgetProperties,
            name: 'new-name',
            version: '1.2.3',
          },
        },
        wrapper.state()
      );

      expect(instance._removeWidget).toHaveBeenCalledTimes(1);
      expect(instance._loadWidgetAssets).toHaveBeenCalledTimes(1);
      expect(instance._mountWidget).not.toHaveBeenCalled();
    });

    it('should not call any action for any other state updates', () => {
      let oldState = Object.assign({}, wrapper.state());

      wrapper.setState({
        testKey: 'value',
        cachedWidgetMeta: {
          name: 'newName',
          version: 'newVersion',
        },
      });

      instance.componentDidUpdate({ widgetProperties }, oldState);

      expect(instance._mountWidget).not.toHaveBeenCalled();
      expect(instance._removeWidget).not.toHaveBeenCalled();
      expect(instance._loadWidgetAssets).not.toHaveBeenCalled();
    });

    it('should not call any action for any other prop updates', () => {
      wrapper.setProps({
        testKey: 'value',
      });

      instance.componentDidUpdate({ widgetProperties }, wrapper.state());

      expect(instance._mountWidget).not.toHaveBeenCalled();
      expect(instance._removeWidget).not.toHaveBeenCalled();
      expect(instance._loadWidgetAssets).not.toHaveBeenCalled();
      expect(instance.setState).not.toHaveBeenCalled();
    });
  });

  describe('componentWillUnmount() method', () => {
    it('should remove widget on unmounting', () => {
      spyOn(instance, '_removeWidget');

      instance.componentWillUnmount();

      expect(instance._removeWidget).toHaveBeenCalled();
      expect(instance._removeWidget).toHaveBeenCalledTimes(1);
    });
  });

  describe('_renderFallback() method', () => {
    it('should return null if no children are given', () => {
      wrapper.setProps({ children: undefined });

      expect(instance._renderFallback()).toBe(null);
    });

    it('should return react element', () => {
      let element = <span>Fallback</span>;
      wrapper.setProps({ children: element });

      expect(instance._renderFallback()).toBe(element);
    });

    it('should return result of children function call', () => {
      wrapper.setProps({ children: ({ error }) => `error:${error}` });
      wrapper.setState({
        encounteredError: 'test-error',
      });

      expect(instance._renderFallback()).toBe('error:test-error');
    });
  });

  describe('_renderStyleAssets() method', () => {
    it('should return array of style elements for given widget assets', () => {
      expect(instance._renderStyleAssets()).toMatchInlineSnapshot(`
        Array [
          <link
            href="http://localhost:4444/static/es9/widget.814e0cb568c7ddc0725d.css"
            rel="stylesheet"
          />,
          <style
            dangerouslySetInnerHTML={
              Object {
                "__html": "html { font-weight: bold; }",
              }
            }
          />,
        ]
      `);
    });

    it('should filter out and render only valid assets', () => {
      wrapper.setProps({
        widgetProperties: {
          ...widgetProperties,
          assets: [
            {
              type: 'stylesheet',
            },
            {
              type: 'stylesheet',
              source: '',
            },
            {
              type: 'inlineStyle',
              source: null,
            },
            {
              type: 'inlineStyle',
              source: 'html { background: red; }',
            },
          ],
        },
      });

      let result = instance._renderStyleAssets();
      expect(result).toHaveLength(1);
      expect(instance._renderStyleAssets()).toMatchInlineSnapshot(`
        Array [
          <style
            dangerouslySetInnerHTML={
              Object {
                "__html": "html { background: red; }",
              }
            }
          />,
        ]
      `);
    });

    it('should return empty array for no style assets', () => {
      wrapper.setProps({
        widgetProperties: {
          ...widgetProperties,
          assets: [],
        },
      });

      let result = instance._renderStyleAssets();
      expect(result).toHaveLength(0);
      expect(result).toMatchInlineSnapshot(`Array []`);
    });

    it('should return empty array for invalid assets', () => {
      wrapper.setProps({
        widgetProperties: {
          ...widgetProperties,
          assets: null,
        },
      });

      let result = instance._renderStyleAssets();
      expect(result).toHaveLength(0);
      expect(result).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('_getWidgetHTML() method', () => {
    beforeEach(() => {
      spyOn(MerkurComponent.prototype, '_getWidgetHTML').mockRestore();
      spyOn(instance, '_getSSRHTML').and.returnValue('SSR HTML');
    });

    it('should return SSR rendered HTML', () => {
      wrapper.setProps({
        widgetProperties: {
          ...widgetProperties,
          html: '',
        },
      });

      expect(instance._html).toBe(null);
      expect(instance.props.widgetProperties.html).toBe('');
      expect(instance._getWidgetHTML()).toBe('SSR HTML');
    });

    it('should return widgetProperties html if available', () => {
      expect(instance._html).toBe(null);
      expect(instance._getWidgetHTML()).toBe(widgetProperties.html);
    });

    it('should return cached html when called multiple times', () => {
      wrapper.setProps({
        widgetProperties: {
          ...widgetProperties,
          html: '',
        },
      });

      expect(instance._getWidgetHTML()).toBe('SSR HTML');
      expect(instance._getWidgetHTML()).toBe('SSR HTML');
      expect(instance._getWidgetHTML()).toBe('SSR HTML');
      expect(instance._getWidgetHTML()).toBe('SSR HTML');
      expect(instance._getSSRHTML).toHaveBeenCalledTimes(1);
    });
  });

  describe('_handleError() method', () => {
    let onError = jest.fn();

    beforeEach(() => {
      spyOn(instance, 'setState').and.callThrough();
      wrapper.setProps({
        onError,
      });
    });

    it('should call props.onError if defined', () => {
      instance._handleError('error');

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith('error');
    });

    it('should set error to state', () => {
      instance._handleError('error');

      expect(instance.setState).toHaveBeenCalledTimes(1);
      expect(instance.setState).toHaveBeenCalledWith({
        encounteredError: 'error',
      });
    });
  });

  describe('_removeWidget() method', () => {
    let onWidgetUnmounting = jest.fn();

    beforeEach(() => {
      wrapper.setProps({
        onWidgetUnmounting,
      });
    });

    it('should return if there is no widget instance currently available', () => {
      expect(instance._widget).toBe(null);

      instance._removeWidget();

      expect(onWidgetUnmounting).not.toHaveBeenCalled();
    });

    it('should call props.onWidgetUnmounting', () => {
      let widget = { name: 'name', unmount: jest.fn() };
      instance._widget = widget;

      instance._removeWidget();

      expect(onWidgetUnmounting).toHaveBeenCalledTimes(1);
      expect(onWidgetUnmounting).toHaveBeenCalledWith(widget);
    });

    it('should remove event listeners before unmounting', () => {
      let offWidget = jest.fn();
      instance._widget = { name: 'name', unmount: jest.fn(), off: offWidget };

      instance._removeWidget();

      expect(offWidget).toHaveBeenCalledTimes(1);
      expect(offWidget).toHaveBeenCalledWith(
        '@merkur/plugin-error.error',
        instance._handleClientError
      );
    });

    it('should unmount widget and do cleanup', () => {
      let unmount = jest.fn();
      let widget = { name: 'name', unmount };
      instance._widget = widget;
      instance._html = 'html';

      expect(instance._widget).toBe(widget);
      expect(instance._html).toBe('html');

      instance._removeWidget();

      expect(unmount).toHaveBeenCalled();
      expect(unmount).toHaveBeenCalledTimes(1);
      expect(instance._widget).toBe(null);
      expect(instance._html).toBe(null);
    });
  });

  describe('_loadWidgetAssets() method', () => {
    beforeEach(() => {
      spyOn(instance, '_handleError').and.stub();
      spyOn(instance, 'setState').and.callThrough();
    });

    it('should return if there are no widget properties', async () => {
      wrapper.setProps({ widgetProperties: null });

      await instance._loadWidgetAssets();

      expect(instance.props.widgetProperties).toBe(null);
      expect(MerkurIntegration.loadStyleAssets).not.toHaveBeenCalled();
      expect(MerkurIntegration.loadScriptAssets).not.toHaveBeenCalled();
    });

    it('should return if there is already existing widget instance', async () => {
      instance._widget = {};

      await instance._loadWidgetAssets();

      expect(instance.props.widgetProperties).toBe(widgetProperties);
      expect(MerkurIntegration.loadStyleAssets).not.toHaveBeenCalled();
      expect(MerkurIntegration.loadScriptAssets).not.toHaveBeenCalled();
    });

    it('should load widget assets and update the state', async () => {
      await instance._loadWidgetAssets();

      expect(instance.props.widgetProperties).toBe(widgetProperties);
      expect(MerkurIntegration.loadStyleAssets).toHaveBeenCalledTimes(1);
      expect(MerkurIntegration.loadScriptAssets).toHaveBeenCalledTimes(1);
      expect(instance.setState).toHaveBeenCalledTimes(1);
      expect(instance.setState).toHaveBeenCalledWith(
        { assetsLoaded: true },
        expect.any(Function)
      );
    });

    it('should handle error occured during script asset loading', async () => {
      spyOn(MerkurIntegration, 'loadScriptAssets').mockImplementation(() =>
        Promise.reject('failed to load')
      );

      await instance._loadWidgetAssets();

      expect(instance.props.widgetProperties).toBe(widgetProperties);
      expect(MerkurIntegration.loadStyleAssets).toHaveBeenCalledTimes(1);
      expect(MerkurIntegration.loadScriptAssets).toHaveBeenCalledTimes(0);
      expect(instance.setState).not.toHaveBeenCalled();
      expect(instance._handleError).toHaveBeenCalledTimes(1);
      expect(instance._handleError).toHaveBeenCalledWith('failed to load');
    });

    it('should handle error occured during asset loading', async () => {
      spyOn(MerkurIntegration, 'loadStyleAssets').mockImplementation(() =>
        Promise.reject('failed to load')
      );

      await instance._loadWidgetAssets();

      expect(instance.props.widgetProperties).toBe(widgetProperties);
      expect(MerkurIntegration.loadStyleAssets).toHaveBeenCalledTimes(0);
      expect(MerkurIntegration.loadScriptAssets).toHaveBeenCalledTimes(1);
      expect(instance.setState).not.toHaveBeenCalled();
      expect(instance._handleError).toHaveBeenCalledTimes(1);
      expect(instance._handleError).toHaveBeenCalledWith('failed to load');
    });
  });

  describe('_getSSRHTML() method', () => {
    it('return empty string if component is already mounted', () => {
      instance._isMounted = true;
      spyOn(instance, '_isClient').and.returnValue(true);

      expect(instance._getSSRHTML()).toBe('');
    });

    it('return empty string if we are not on client', () => {
      instance._isMounted = false;
      spyOn(instance, '_isClient').and.returnValue(false);

      expect(instance._getSSRHTML()).toBe('');
    });

    it('return html widget content from document', () => {
      instance._isMounted = false;
      spyOn(instance, '_isClient').and.returnValue(true);

      delete global.document;
      global.document = {
        querySelector: () => ({
          children: [
            {
              outerHTML: 'outerHTML',
            },
          ],
        }),
      };

      expect(instance._getSSRHTML()).toBe('outerHTML');
    });
  });

  describe('_isClient() method', () => {
    beforeEach(() => {
      delete global.document;
      delete global.window;

      MerkurComponent.prototype._isClient.mockRestore();
    });

    it('should return false for non-browser environments', () => {
      expect(instance._isClient()).toBe(false);

      global.window = {};

      expect(instance._isClient()).toBe(false);

      delete global.window;
      global.document = {};

      expect(instance._isClient()).toBe(false);
    });

    it('should return true for browser environments', () => {
      global.window = {};
      global.document = {};

      expect(instance._isClient()).toBe(true);
    });
  });

  describe('_isSSRHydrate() method', () => {
    beforeEach(() => {
      MerkurComponent.prototype._isSSRHydrate.mockRestore();
    });

    it("should return true if there's some server side rendered html", () => {
      spyOn(instance, '_getSSRHTML').and.returnValue('html');

      expect(instance._isSSRHydrate()).toBe(true);
    });

    it('should return false, if SSR renderd html is empty', () => {
      spyOn(instance, '_getSSRHTML').and.returnValue('');

      expect(instance._isSSRHydrate()).toBe(false);
    });
  });
});
