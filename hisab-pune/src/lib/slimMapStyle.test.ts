import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { slimPositronStyle } from './slimMapStyle.ts';

describe('slimPositronStyle', () => {
  const style = {
    version: 8,
    layers: [
      { id: 'paper', type: 'background' },
      { id: 'water', type: 'fill', 'source-layer': 'water' },
      { id: 'road', type: 'line', 'source-layer': 'transportation' },
      { id: 'poi', type: 'symbol', 'source-layer': 'poi' },
      { id: 'highway-shield-us-interstate', type: 'symbol', 'source-layer': 'transportation_name' },
      { id: 'highway-shield-non-us', type: 'symbol', 'source-layer': 'transportation_name' },
      { id: 'housenumber', type: 'symbol', 'source-layer': 'housenumber' },
      { id: 'road_shield_us', type: 'symbol', 'source-layer': 'transportation_name' },
      { id: 'water_name_point_label', type: 'symbol', 'source-layer': 'water_name' },
      { id: 'airport', type: 'symbol', 'source-layer': 'aerodrome_label' },
      { id: 'highway-name-major', type: 'symbol', 'source-layer': 'transportation_name' },
      { id: 'highway-name-minor', type: 'symbol', 'source-layer': 'transportation_name' },
      { id: 'label_city', type: 'symbol', 'source-layer': 'place' },
      { id: 'label_village', type: 'symbol', 'source-layer': 'place' },
      { id: 'place-town', type: 'symbol' },
      { id: 'road-label', type: 'symbol' },
    ],
  };

  it('drops poi, highway-shield, and housenumber symbol layers', () => {
    const ids = slimPositronStyle(style).layers.map((layer) => layer.id);
    assert.equal(ids.includes('poi'), false);
    assert.equal(ids.includes('highway-shield-us-interstate'), false);
    assert.equal(ids.includes('highway-shield-non-us'), false);
    assert.equal(ids.includes('housenumber'), false);
    assert.equal(ids.includes('road_shield_us'), false);
  });

  it('drops other non-road non-place symbol layers', () => {
    const ids = slimPositronStyle(style).layers.map((layer) => layer.id);
    assert.equal(ids.includes('water_name_point_label'), false);
    assert.equal(ids.includes('airport'), false);
  });

  it('keeps road and place label layers and all non-symbol layers', () => {
    const ids = slimPositronStyle(style).layers.map((layer) => layer.id);
    assert.deepEqual(ids, [
      'paper',
      'water',
      'road',
      'highway-name-major',
      'highway-name-minor',
      'label_city',
      'label_village',
      'place-town',
      'road-label',
    ]);
  });
});
