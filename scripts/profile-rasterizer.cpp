// Small, deterministic CPU renderer. No browser, GPU, or display server required.
// Orthographic projection, interpolated normals, fixed lights and ambient occlusion.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <vector>

extern "C" void render_surface(
    const float* points, const float* normals, const int32_t* faces, int face_count,
    const float* lights, int size, float scale, uint8_t* output) {
  const int pixels = size * size;
  std::vector<float> depth(pixels, -1e9f), nx(pixels), ny(pixels), nz(pixels);
  for (int f = 0; f < face_count; ++f) {
    int ids[3] = {faces[f*3], faces[f*3+1], faces[f*3+2]};
    const float* a = points + ids[0]*3;
    const float* b = points + ids[1]*3;
    const float* c = points + ids[2]*3;
    float denom = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1]);
    if (std::abs(denom) < 1e-8f) continue;
    int x0 = std::max(0, (int)std::floor(std::min({a[0],b[0],c[0]})));
    int x1 = std::min(size-1, (int)std::ceil(std::max({a[0],b[0],c[0]})));
    int y0 = std::max(0, (int)std::floor(std::min({a[1],b[1],c[1]})));
    int y1 = std::min(size-1, (int)std::ceil(std::max({a[1],b[1],c[1]})));
    for (int y=y0; y<=y1; ++y) for (int x=x0; x<=x1; ++x) {
      float u=((b[1]-c[1])*(x+.5f-c[0])+(c[0]-b[0])*(y+.5f-c[1]))/denom;
      float v=((c[1]-a[1])*(x+.5f-c[0])+(a[0]-c[0])*(y+.5f-c[1]))/denom;
      float w=1-u-v;
      if(u<0 || v<0 || w<0) continue;
      float z=u*a[2]+v*b[2]+w*c[2];
      int p=y*size+x;
      if(z<=depth[p]) continue;
      depth[p]=z;
      nx[p]=u*normals[ids[0]*3]+v*normals[ids[1]*3]+w*normals[ids[2]*3];
      ny[p]=u*normals[ids[0]*3+1]+v*normals[ids[1]*3+1]+w*normals[ids[2]*3+1];
      nz[p]=u*normals[ids[0]*3+2]+v*normals[ids[1]*3+2]+w*normals[ids[2]*3+2];
    }
  }
  // A fixed sampling pattern keeps shadows stable throughout the rotation.
  const int offsets[16][2]={{4,0},{4,2},{3,3},{2,4},{0,4},{-2,4},{-3,3},{-4,2},
                          {-4,0},{-4,-2},{-3,-3},{-2,-4},{0,-4},{2,-4},{3,-3},{4,-2}};
  for(int y=0;y<size;++y) for(int x=0;x<size;++x) {
    int p=y*size+x;
    if(depth[p]<-1e8f){ output[p]=255; continue; }
    float n[3]={nx[p],ny[p],nz[p]};
    float mag=std::sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);
    for(float& val:n) val/=std::max(mag,1e-8f);
    float shade=.12f;
    for(int k=0;k<3;++k){
      const float* l=lights+4*k;
      float dot=std::max(0.f,n[0]*l[0]+n[1]*l[1]+n[2]*l[2]);
      float hz=l[2]+1.f;
      float hm=std::sqrt(l[0]*l[0]+l[1]*l[1]+hz*hz);
      float halfdot=std::max(0.f,(n[0]*l[0]+n[1]*l[1]+n[2]*hz)/hm);
      shade+=l[3]*(.73f*dot+.30f*std::pow(halfdot,48.f));
    }
    float occ=0;
    for(int ring=1;ring<=3;++ring) for(const auto& step:offsets){
      int dx=step[0]*ring, dy=step[1]*ring;
      int xx=x+dx, yy=y+dy;
      if(xx<0||xx>=size||yy<0||yy>=size)continue;
      float dz=depth[yy*size+xx]-depth[p];
      if(std::abs(dz)>22)continue;
      float vx=dx/scale,vy=-dy/scale;
      float len=std::sqrt(vx*vx+vy*vy+dz*dz);
      float cosine=(n[0]*vx+n[1]*vy+n[2]*dz)/len;
      occ+=std::max(0.f,cosine-.09f)*std::max(0.f,1-len/22.f);
    }
    float ao=std::max(.18f,1-occ*.09f);
    float linear=std::clamp(shade*ao*.88f,0.f,1.f);
    output[p]=(uint8_t)std::round(255*std::pow(linear,1/1.5f));
  }
}
