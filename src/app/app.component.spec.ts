import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { GraphCanvasComponent } from './graph-canvas/graph-canvas.component';
import { PropertiesPanelComponent } from './properties-panel/properties-panel.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations'; // Importar si se usan animaciones o para evitar errores con ellas en tests
import { CommonModule } from '@angular/common';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent, // AppComponent es standalone, se importa directamente
        // CommonModule, // Ya está importado en AppComponent
        // GraphCanvasComponent, // Ya está importado en AppComponent
        // PropertiesPanelComponent, // Ya está importado en AppComponent
        // NoopAnimationsModule // Útil si hay animaciones
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'mapas-conocimiento' title property`, () => { // Modificado para reflejar que es una propiedad
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('mapas-conocimiento');
  });

  it('should render title in H1 tag', () => { // Modificado para ser más específico
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // El contenido actual del H1 es "Mapas de Conocimiento"
    expect(compiled.querySelector('h1')?.textContent).toContain('Mapas de Conocimiento');
  });
});