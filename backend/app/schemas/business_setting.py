from pydantic import BaseModel, ConfigDict


class BusinessSettingUpsertRequest(BaseModel):
    key: str
    value: str


class BusinessSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: str
