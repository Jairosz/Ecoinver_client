import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CultiveMapComponent } from './cultive-map.component';

describe('CultiveMapComponent', () => {
  let component: CultiveMapComponent;
  let fixture: ComponentFixture<CultiveMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CultiveMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CultiveMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
